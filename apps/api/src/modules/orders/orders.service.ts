import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { HotSaleStatus, OrderStatus, Prisma, User, UserRole } from "@frsh/database";
import { PrismaService } from "../../prisma.module";
import { RequestOrderInput, UpdateOrderStatusInput } from "./orders.types";

const orderInclude = { items: { orderBy: { id: "asc" as const } } } as const;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async forConsumer(user: User) {
    const orders = await this.prisma.order.findMany({
      where: { consumerId: user.id },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    });
    return orders.map((order) => this.view(order));
  }

  async forSeller(user: User) {
    this.requireSeller(user);
    const orders = await this.prisma.order.findMany({
      where: { sellerId: user.id },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    });
    return orders.map((order) => this.view(order));
  }

  async request(user: User, input: RequestOrderInput) {
    const ids = input.items.map((item) => item.hotSaleId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException("Each product may appear only once");
    }
    const order = await this.prisma.$transaction(async (tx) => {
      const sales = await tx.hotSale.findMany({
        where: { id: { in: ids } },
        include: {
          rekoRings: { include: { rekoRing: { include: { schedule: true } } } },
          seller: { include: { producerProfile: true, businessProfile: true } },
        },
      });
      if (sales.length !== ids.length) throw new BadRequestException("A product is no longer available");
      const sellerId = sales[0]?.sellerId;
      if (!sellerId || sales.some((sale) => sale.sellerId !== sellerId)) {
        throw new BadRequestException("One order can contain products from only one farm");
      }
      const seller = sales[0].seller;
      const quantities = new Map(input.items.map((item) => [item.hotSaleId, item.quantity]));
      let ring: (typeof sales)[number]["rekoRings"][number]["rekoRing"] | null = null;
      if (input.pickupType === "FARM") {
        if (sales.some((sale) => !sale.availableAtFarm)) {
          throw new BadRequestException("Every product must support farm pickup");
        }
      } else {
        if (!input.rekoRingId) throw new BadRequestException("Select a REKO pickup ring");
        if (sales.some((sale) => !sale.rekoRings.some((entry) => entry.rekoRingId === input.rekoRingId))) {
          throw new BadRequestException("Every product must support the selected REKO ring");
        }
        ring = sales[0].rekoRings.find((entry) => entry.rekoRingId === input.rekoRingId)!.rekoRing;
      }
      let totalCents = 0;
      for (const sale of sales) {
        const quantity = quantities.get(sale.id)!;
        if (sale.status !== HotSaleStatus.ACTIVE || sale.quantity + 1e-9 < quantity) {
          throw new BadRequestException(`${sale.originalTitle} does not have enough stock`);
        }
        const steps = quantity / sale.quantityStep;
        if (Math.abs(steps - Math.round(steps)) > 1e-6) {
          throw new BadRequestException(`${sale.originalTitle} must use increments of ${sale.quantityStep}`);
        }
        const reserved = await tx.hotSale.updateMany({
          where: { id: sale.id, status: HotSaleStatus.ACTIVE, quantity: { gte: quantity } },
          data: { quantity: { decrement: quantity } },
        });
        if (reserved.count !== 1) throw new BadRequestException(`${sale.originalTitle} stock just changed`);
        const remaining = sale.quantity - quantity;
        if (remaining <= 1e-9) {
          await tx.hotSale.update({ where: { id: sale.id }, data: { status: HotSaleStatus.SOLD_OUT } });
        }
        totalCents += Math.round(quantity * sale.priceCents);
      }
      const farmName = seller.businessProfile
        ? seller.businessProfile.farmName ?? seller.businessProfile.publicDisplayName
        : seller.producerProfile?.publicName ?? seller.displayName ?? "Local farm";
      const farmAddress = [seller.addressLine, seller.city].filter(Boolean).join(", ");
      const schedule = ring?.schedule
        ? `${ring.schedule.weekday}|${ring.schedule.startTime}|${ring.schedule.endTime}|${ring.schedule.timezone}`
        : null;
      return tx.order.create({
        data: {
          consumerId: user.id,
          sellerId,
          pickupType: input.pickupType as "FARM" | "REKO",
          rekoRingId: ring?.id,
          pickupName: ring?.name ?? farmName,
          pickupAddress: ring ? [ring.addressLine, ring.municipality].filter(Boolean).join(", ") : farmAddress,
          pickupSchedule: schedule,
          farmName,
          consumerName: user.displayName ?? user.email ?? "Consumer",
          consumerEmail: user.email,
          consumerPhone: user.phone,
          totalCents,
          items: {
            create: sales.map((sale) => {
              const quantity = quantities.get(sale.id)!;
              return {
                hotSaleId: sale.id,
                title: sale.originalTitle,
                imageMimeType: sale.imageMimeType,
                imageData: sale.imageData,
                unit: sale.customUnit ?? sale.unit,
                quantityStep: sale.quantityStep,
                quantity,
                unitPriceCents: sale.priceCents,
                lineTotalCents: Math.round(quantity * sale.priceCents),
              };
            }),
          },
        },
        include: orderInclude,
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return this.view(order);
  }

  async updateStatus(user: User, input: UpdateOrderStatusInput) {
    this.requireSeller(user);
    const order = await this.prisma.order.findUnique({ where: { id: input.id }, include: orderInclude });
    if (!order) throw new NotFoundException("Order not found");
    if (order.sellerId !== user.id) throw new ForbiddenException();
    const allowed: Record<string, string[]> = {
      REQUESTED: ["ACCEPTED", "REJECTED"],
      ACCEPTED: ["READY_FOR_PICKUP"],
      READY_FOR_PICKUP: ["COMPLETED"],
    };
    if (!allowed[order.status]?.includes(input.status)) throw new BadRequestException("Invalid order status change");
    const updated = await this.prisma.$transaction(async (tx) => {
      if (input.status === "REJECTED") await this.restoreStock(tx, order.items);
      const now = new Date();
      return tx.order.update({
        where: { id: order.id },
        data: {
          status: input.status as OrderStatus,
          acceptedAt: input.status === "ACCEPTED" ? now : undefined,
          readyAt: input.status === "READY_FOR_PICKUP" ? now : undefined,
          completedAt: input.status === "COMPLETED" ? now : undefined,
          cancelledAt: input.status === "REJECTED" ? now : undefined,
        },
        include: orderInclude,
      });
    });
    return this.view(updated);
  }

  async cancel(user: User, id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: orderInclude });
    if (!order) throw new NotFoundException("Order not found");
    if (order.consumerId !== user.id) throw new ForbiddenException();
    if (order.status !== OrderStatus.REQUESTED) throw new BadRequestException("Only requested orders can be cancelled");
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.restoreStock(tx, order.items);
      return tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED, cancelledAt: new Date() },
        include: orderInclude,
      });
    });
    return this.view(updated);
  }

  private async restoreStock(tx: Prisma.TransactionClient, items: Array<{ hotSaleId: string; quantity: number }>) {
    for (const item of items) {
      const sale = await tx.hotSale.findUnique({ where: { id: item.hotSaleId }, select: { status: true } });
      if (!sale) continue;
      await tx.hotSale.update({
        where: { id: item.hotSaleId },
        data: {
          quantity: { increment: item.quantity },
          status: sale.status === HotSaleStatus.SOLD_OUT ? HotSaleStatus.ACTIVE : sale.status,
        },
      });
    }
  }

  private requireSeller(user: User) {
    if (!user.roles.some((role) => role === UserRole.SIDE_HUSTLER || role === UserRole.BUSINESS)) {
      throw new ForbiddenException("A producer account is required");
    }
  }

  private view(order: any) {
    return {
      ...order,
      items: order.items.map((item: any) => ({
        ...item,
        imageBase64: Buffer.from(item.imageData).toString("base64"),
      })),
    };
  }
}
