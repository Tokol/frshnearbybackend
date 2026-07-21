import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { DecodedIdToken } from "firebase-admin/auth";
import { PrismaService } from "../../prisma.module";
import { FirebaseService } from "./firebase.service";
import {
  EmailSignupInput,
  ResendEmailSignupCodeInput,
  VerifyEmailSignupInput,
} from "./auth.types";

@Injectable()
export class AuthService {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly prisma: PrismaService,
  ) {}

  async authenticate(header?: string | string[]) {
    const token = this.extractBearerToken(header);
    let decoded: DecodedIdToken;
    try {
      decoded = await this.firebase.verify(token);
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

  private extractBearerToken(header?: string | string[]) {
    const value = Array.isArray(header) ? header[0] : header;
    if (!value) {
      throw new UnauthorizedException("Missing bearer token");
    }
    const [scheme, token, extra] = value.trim().split(/\s+/);
    if (scheme !== "Bearer" || !token || extra) {
      throw new UnauthorizedException("Malformed bearer token");
    }
    return token;
  }

  async sessionUser(id: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: {
        producerProfile: true,
        businessProfile: true,
        submissions: {
          orderBy: { submittedAt: "desc" },
          take: 1,
          select: {
            requestTitle: true,
            userMessage: true,
            requestedDocumentKinds: true,
            requiresTextResponse: true,
          },
        },
      },
    });
    return {
      ...user,
      latestVerificationRequestTitle:
        user.submissions[0]?.requestTitle ?? null,
      latestVerificationMessage: user.submissions[0]?.userMessage ?? null,
      latestVerificationRequestedDocuments:
        user.submissions[0]?.requestedDocumentKinds ?? [],
      latestVerificationRequiresTextResponse:
        user.submissions[0]?.requiresTextResponse ?? false,
    };
  }

  async requestEmailSignup(input: EmailSignupInput) {
    const email = this.normalizeEmail(input.email);
    const displayName = input.displayName.trim();
    let firebaseUid: string;

    try {
      const existing = await this.firebase.auth.getUserByEmail(email);
      if (existing.emailVerified) {
        throw new BadRequestException("This email is already verified.");
      }
      const updated = await this.firebase.auth.updateUser(existing.uid, {
        email,
        password: input.password,
        displayName,
        disabled: false,
      });
      firebaseUid = updated.uid;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      if ((error as { code?: string }).code !== "auth/user-not-found") {
        throw error;
      }
      const created = await this.firebase.auth.createUser({
        email,
        password: input.password,
        displayName,
        emailVerified: false,
        disabled: false,
      });
      firebaseUid = created.uid;
    }

    return this.createAndSendSignupCode(email, firebaseUid, displayName);
  }

  async resendEmailSignupCode(input: ResendEmailSignupCodeInput) {
    const email = this.normalizeEmail(input.email);
    const pending = await this.prisma.emailSignupVerification.findUnique({
      where: { email },
    });
    if (!pending) {
      throw new BadRequestException("No email verification is pending.");
    }
    if (pending.resendAvailableAt > new Date()) {
      throw new BadRequestException("Please wait before requesting a new code.");
    }

    return this.createAndSendSignupCode(
      email,
      pending.firebaseUid,
      pending.displayName ?? "FRSH Nearby user",
    );
  }

  async verifyEmailSignup(input: VerifyEmailSignupInput) {
    const email = this.normalizeEmail(input.email);
    const pending = await this.prisma.emailSignupVerification.findUnique({
      where: { email },
    });
    if (!pending) {
      throw new BadRequestException("No email verification is pending.");
    }
    if (pending.expiresAt < new Date()) {
      throw new BadRequestException("The verification code has expired.");
    }
    if (pending.attempts >= 5) {
      throw new BadRequestException("Too many incorrect code attempts.");
    }
    if (!this.codeMatches(input.code, pending.codeSalt, pending.codeHash)) {
      await this.prisma.emailSignupVerification.update({
        where: { email },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException("The verification code is not correct.");
    }

    let firebaseUid = pending.firebaseUid;
    if (!firebaseUid) {
      const firebaseUser = await this.firebase.auth.getUserByEmail(email);
      firebaseUid = firebaseUser.uid;
    }
    const firebaseUser = await this.firebase.auth.updateUser(firebaseUid, {
      emailVerified: true,
    });
    const user = await this.prisma.user.upsert({
      where: { firebaseUid },
      create: {
        firebaseUid,
        email,
        emailVerified: true,
        displayName: pending.displayName ?? firebaseUser.displayName,
        onboardingStep: "ROLE_SELECTION_REQUIRED",
      },
      update: {
        email,
        emailVerified: true,
        displayName: pending.displayName ?? firebaseUser.displayName,
        onboardingStep: "ROLE_SELECTION_REQUIRED",
        lastLoginAt: new Date(),
      },
    });
    await this.prisma.emailSignupVerification.delete({ where: { email } });
    const customToken = await this.firebase.auth.createCustomToken(firebaseUid);
    return { customToken, user };
  }

  private async createAndSendSignupCode(
    email: string,
    firebaseUid: string | null | undefined,
    displayName: string,
  ) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
    const resendAvailableAt = new Date(now.getTime() + 45 * 1000);
    const code = randomInt(100000, 1000000).toString();
    const codeSalt = randomBytes(16).toString("hex");
    const codeHash = this.hashCode(code, codeSalt);

    await this.prisma.emailSignupVerification.upsert({
      where: { email },
      create: {
        email,
        firebaseUid,
        displayName,
        codeHash,
        codeSalt,
        attempts: 0,
        expiresAt,
        resendAvailableAt,
      },
      update: {
        firebaseUid,
        displayName,
        codeHash,
        codeSalt,
        attempts: 0,
        expiresAt,
        resendAvailableAt,
      },
    });
    await this.sendSignupVerificationEmail(email, displayName, code);
    return { email, expiresAt, resendAvailableAt };
  }

  private async sendSignupVerificationEmail(
    email: string,
    displayName: string,
    code: string,
  ) {
    const apiKey = process.env.RESEND_API_KEY;
    const from =
      process.env.SIGNUP_EMAIL_FROM ?? process.env.ONBOARDING_EMAIL_FROM;
    const replyTo = process.env.SIGNUP_EMAIL_REPLY_TO;
    if (!apiKey || !from) {
      throw new ServiceUnavailableException(
        "Signup email is not configured. Set RESEND_API_KEY and SIGNUP_EMAIL_FROM.",
      );
    }

    const firstName = displayName.split(" ")[0] || "there";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        ...(replyTo ? { reply_to: replyTo } : {}),
        to: [email],
        subject: "Your FRSH Nearby verification code",
        text:
          "Hello " +
          firstName +
          ",\n\nYour FRSH Nearby verification code is " +
          code +
          ".\n\nThis code expires in 10 minutes. If you did not request this, you can ignore this email.\n\nFRSH Nearby team",
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new ServiceUnavailableException(
        "Email provider rejected the verification email: " + detail,
      );
    }
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private hashCode(code: string, salt: string) {
    return createHash("sha256").update(salt + ":" + code).digest("hex");
  }

  private codeMatches(code: string, salt: string, expectedHash: string) {
    const actual = Buffer.from(this.hashCode(code.trim(), salt), "hex");
    const expected = Buffer.from(expectedHash, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}
