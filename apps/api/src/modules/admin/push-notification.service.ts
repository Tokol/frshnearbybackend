import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma.module";
import { FirebaseService } from "../auth/firebase.service";

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseService,
  ) {}

  async sendToUser(
    userId: string,
    notification: { title: string; body: string },
    data: Record<string, string>,
  ) {
    const installations = await this.prisma.pushInstallation.findMany({
      where: { userId, enabled: true },
      select: { token: true },
    });
    if (!installations.length) return;
    const tokens = installations.map(({ token }) => token);
    const result = await this.firebase.messaging.sendEachForMulticast({
      tokens,
      notification,
      data,
      android: { priority: "high" },
      apns: { payload: { aps: { sound: "default" } } },
    });
    const invalidTokens = result.responses
      .map((response, index) => ({ response, token: tokens[index] }))
      .filter(({ response }) =>
        [
          "messaging/registration-token-not-registered",
          "messaging/invalid-registration-token",
        ].includes(response.error?.code ?? ""),
      )
      .map(({ token }) => token);
    if (invalidTokens.length) {
      await this.prisma.pushInstallation.deleteMany({
        where: { token: { in: invalidTokens } },
      });
    }
    if (result.failureCount) {
      this.logger.warn(
        `${result.failureCount} of ${tokens.length} push messages failed`,
      );
    }
  }
}
