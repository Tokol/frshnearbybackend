import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { DecodedIdToken } from "firebase-admin/auth";
import { PrismaService } from "../../prisma.module";
import { FirebaseService } from "./firebase.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly prisma: PrismaService,
  ) {}

  async authenticate(header?: string) {
    if (!header?.startsWith("Bearer "))
      throw new UnauthorizedException("Missing bearer token");
    let decoded: DecodedIdToken;
    try {
      decoded = await this.firebase.verify(header.slice(7));
    } catch {
      throw new UnauthorizedException(
        "Invalid or expired authentication token",
      );
    }

    const user = await this.prisma.user.upsert({
      where: { firebaseUid: decoded.uid },
      create: {
        firebaseUid: decoded.uid,
        email: decoded.email,
        emailVerified: decoded.email_verified ?? false,
        displayName: decoded.name,
        photoUrl: decoded.picture,
        onboardingStep: decoded.email_verified
          ? "ROLE_SELECTION_REQUIRED"
          : "EMAIL_VERIFICATION_REQUIRED",
      },
      update: {
        email: decoded.email,
        emailVerified: decoded.email_verified ?? false,
        lastLoginAt: new Date(),
        ...(decoded.name ? { displayName: decoded.name } : {}),
        ...(decoded.picture ? { photoUrl: decoded.picture } : {}),
      },
    });
    if (
      user.emailVerified &&
      user.onboardingStep === "EMAIL_VERIFICATION_REQUIRED"
    ) {
      user.onboardingStep = "ROLE_SELECTION_REQUIRED";
      await this.prisma.user.update({
        where: { id: user.id },
        data: { onboardingStep: "ROLE_SELECTION_REQUIRED" },
      });
    }
    if (user.status === "SUSPENDED")
      throw new ForbiddenException("Account suspended");
    if (user.status === "DELETED")
      throw new ForbiddenException("Account deleted");
    return user;
  }

  sessionUser(id: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: { producerProfile: true, businessProfile: true },
    });
  }
}
