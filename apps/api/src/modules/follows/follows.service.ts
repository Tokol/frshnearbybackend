import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { User, UserRole } from "@frsh/database";
import { PrismaService } from "../../prisma.module";
import { PushNotificationService } from "../admin/push-notification.service";

@Injectable()
export class FollowsService {
  constructor(private readonly prisma: PrismaService, private readonly push: PushNotificationService) {}

  async toggle(user: User, farmId: string) {
    const seller = await this.findSeller(farmId);
    if (seller.id === user.id) throw new BadRequestException("You cannot follow your own farm");
    const key = { consumerId_sellerId: { consumerId: user.id, sellerId: seller.id } };
    const current = await this.prisma.farmFollow.findUnique({ where: key });
    if (current) {
      await this.prisma.farmFollow.delete({ where: key });
    } else {
      const actorName = user.displayName ?? user.email ?? "A consumer";
      await this.prisma.$transaction([
        this.prisma.farmFollow.create({ data: { consumerId: user.id, sellerId: seller.id } }),
        this.prisma.farmNotification.create({
          data: {
            recipientId: seller.id,
            actorId: user.id,
            type: "FARM_FOLLOWED",
            message: `${actorName} followed your farm`,
          },
        }),
      ]);
      try {
        await this.push.sendToUser(
          seller.id,
          { title: "New farm follower", body: `${actorName} followed your farm` },
          { type: "FARM_FOLLOWED", actorId: user.id },
        );
      } catch (_) {
        // The durable in-app notification remains even if push delivery fails.
      }
    }
    const followerCount = await this.prisma.farmFollow.count({ where: { sellerId: seller.id } });
    return { farmId, followed: !current, followerCount };
  }

  async notifications(user: User) {
    this.requireSeller(user);
    const items = await this.prisma.farmNotification.findMany({
      where: { recipientId: user.id },
      include: { actor: { select: { displayName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return items.map((item) => ({
      ...item,
      actorName: item.actor.displayName ?? item.actor.email ?? "Consumer",
      read: item.readAt != null,
    }));
  }

  async markRead(user: User, id: string) {
    const result = await this.prisma.farmNotification.updateMany({
      where: { id, recipientId: user.id },
      data: { readAt: new Date() },
    });
    if (!result.count) throw new NotFoundException("Notification not found");
    return true;
  }

  private findSeller(farmId: string) {
    return this.prisma.user.findFirstOrThrow({
      where: {
        OR: [
          { id: farmId },
          { producerProfile: { is: { id: farmId } } },
          { businessProfile: { is: { id: farmId } } },
        ],
      },
    });
  }

  private requireSeller(user: User) {
    if (!user.roles.some((role) => role === UserRole.SIDE_HUSTLER || role === UserRole.BUSINESS)) {
      throw new ForbiddenException("A producer account is required");
    }
  }
}
