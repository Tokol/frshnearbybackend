import { BadRequestException, Injectable } from "@nestjs/common";
import {
  DocumentKind,
  OnboardingStep,
  Prisma,
  User,
  UserRole,
} from "@frsh/database";
import { mkdir, writeFile } from "fs/promises";
import { basename, dirname, join, resolve } from "path";
import { randomUUID } from "crypto";
import { FirebaseService } from "../auth/firebase.service";
import { PrismaService } from "../../prisma.module";
import {
  BusinessProfileInput,
  ConfirmLocationInput,
  PersonalProfileInput,
  ProducerProfileInput,
  PushInstallationInput,
  SubmitVerificationInput,
  VerificationDocumentUploadInput,
} from "./user.inputs";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseService,
  ) {}

  async registerPushInstallation(user: User, input: PushInstallationInput) {
    await this.prisma.pushInstallation.upsert({
      where: { installationId: input.installationId },
      create: {
        userId: user.id,
        installationId: input.installationId,
        token: input.token,
        platform: input.platform,
        deviceName: input.deviceName,
        locale: input.locale,
      },
      update: {
        userId: user.id,
        platform: input.platform,
        deviceName: input.deviceName,
        locale: input.locale,
        enabled: true,
        lastSeenAt: new Date(),
      },
    });
    return true;
  }

  async unregisterPushInstallation(user: User, token: string) {
    await this.prisma.pushInstallation.deleteMany({
      where: { userId: user.id, token },
    });
    return true;
  }

  confirmLocation(user: User, input: ConfirmLocationInput) {
    if (
      !user.roles.includes("SIDE_HUSTLER") &&
      !user.roles.includes("BUSINESS")
    ) {
      throw new BadRequestException(
        "Only seller accounts store a registered location",
      );
    }
    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        ...input,
        addressConfirmedAt: new Date(),
      },
    });
  }

  async phoneAvailable(user: User, phone: string) {
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      throw new BadRequestException(
        "Enter a valid international phone number",
      );
    }
    const existing = await this.prisma.user.findFirst({
      where: { phone, id: { not: user.id } },
      select: { id: true },
    });
    return existing === null;
  }

  async updatePersonal(user: User, input: PersonalProfileInput) {
    const onboardingStep: OnboardingStep =
      user.onboardingStep === "PROFILE_REQUIRED"
        ? "COMPLETE"
        : user.onboardingStep;
    try {
      return await this.prisma.user.update({
        where: { id: user.id },
        data: {
          displayName: input.displayName,
          phone: input.phone,
          dateOfBirth: new Date(input.dateOfBirth),
          photoUrl: input.photoUrl,
          onboardingStep,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new BadRequestException(
          "This phone number is already registered to another account.",
        );
      }
      throw error;
    }
  }

  selectType(
    user: User,
    accountType: "CONSUMER" | "SIDE_HUSTLER" | "BUSINESS",
  ) {
    const roles: UserRole[] =
      accountType === "CONSUMER"
        ? [UserRole.CONSUMER]
        : [UserRole.CONSUMER, UserRole[accountType]];
    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        roles,
        onboardingStep:
          accountType === "BUSINESS"
            ? "BUSINESS_DETAILS_REQUIRED"
            : accountType === "SIDE_HUSTLER"
              ? "PRODUCER_DETAILS_REQUIRED"
              : "PROFILE_REQUIRED",
        verificationStatus:
          accountType === "CONSUMER" ? "NOT_REQUIRED" : "DRAFT",
      },
    });
  }

  async saveProducer(user: User, input: ProducerProfileInput) {
    if (!user.roles.includes("SIDE_HUSTLER"))
      throw new BadRequestException("Select side hustler first");
    await this.prisma.producerProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...input },
      update: input,
    });
    return this.prisma.user.update({
      where: { id: user.id },
      data: { onboardingStep: "COMPLETE", verificationStatus: "DRAFT" },
    });
  }

  async saveBusiness(user: User, input: BusinessProfileInput) {
    if (!user.roles.includes("BUSINESS"))
      throw new BadRequestException("Select registered business first");
    await this.prisma.businessProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...input },
      update: input,
    });
    return this.prisma.user.update({
      where: { id: user.id },
      data: { onboardingStep: "COMPLETE", verificationStatus: "DRAFT" },
    });
  }

  async submit(user: User, input: SubmitVerificationInput) {
    const kind = user.roles.includes("BUSINESS")
      ? "BUSINESS"
      : user.roles.includes("SIDE_HUSTLER")
        ? "SIDE_HUSTLER"
        : null;
    if (!kind)
      throw new BadRequestException(
        "Consumer accounts do not require verification",
      );
    if (
      kind === "BUSINESS" &&
      !(await this.prisma.businessProfile.findUnique({
        where: { userId: user.id },
      }))
    )
      throw new BadRequestException("Business profile is incomplete");
    if (
      kind === "SIDE_HUSTLER" &&
      !(await this.prisma.producerProfile.findUnique({
        where: { userId: user.id },
      }))
    )
      throw new BadRequestException("Producer profile is incomplete");
    const latestChangeRequest =
      user.verificationStatus === "NEEDS_CHANGES"
        ? await this.prisma.verificationSubmission.findFirst({
            where: { applicantId: user.id, status: "NEEDS_CHANGES" },
            orderBy: { reviewedAt: "desc" },
          })
        : null;
    this.validateVerificationSubmission(kind, input, latestChangeRequest);
    const documents = await Promise.all(
      input.documents.map((document) =>
        this.saveVerificationDocumentFile(user.id, document),
      ),
    );
    await this.prisma.$transaction([
      this.prisma.verificationSubmission.create({
        data: {
          applicantId: user.id,
          kind,
          status: "SUBMITTED",
          userResponse: input.responseMessage?.trim(),
          documents: {
            create: documents.map((document) => ({
              kind: document.kind,
              storageKey: document.storageKey,
              originalName: document.originalName,
              mimeType: document.mimeType,
            })),
          },
        },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          verificationStatus: "SUBMITTED",
          onboardingStep: "SUBMITTED_FOR_REVIEW",
        },
      }),
    ]);
    return this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  }

  private validateVerificationSubmission(
    kind: "SIDE_HUSTLER" | "BUSINESS",
    input: SubmitVerificationInput,
    latestChangeRequest: {
      requestedDocumentKinds: DocumentKind[];
      requiresTextResponse: boolean;
    } | null,
  ) {
    const documents = input.documents ?? [];
    const response = input.responseMessage?.trim();
    if (documents.length > 5) {
      throw new BadRequestException("Upload no more than five documents");
    }
    if (latestChangeRequest) {
      const requested = new Set(latestChangeRequest.requestedDocumentKinds);
      const uploaded = new Set(documents.map((document) => document.kind));
      for (const kind of requested) {
        if (!uploaded.has(kind)) {
          throw new BadRequestException(
            `Upload the requested ${kind.replaceAll("_", " ").toLowerCase()} document`,
          );
        }
      }
      if (
        latestChangeRequest.requiresTextResponse &&
        (!response || response.length < 2)
      ) {
        throw new BadRequestException("Add a written response for the reviewer");
      }
      if (requested.size === 0 && !latestChangeRequest.requiresTextResponse) {
        throw new BadRequestException("No verification changes were requested");
      }
      return;
    }

    if (!documents.length) {
      throw new BadRequestException("Upload at least one verification document");
    }
    const kinds = new Set(documents.map((document) => document.kind));
    if (kind === "SIDE_HUSTLER" && !kinds.has("IDENTITY")) {
      throw new BadRequestException("Upload proof of identity");
    }
    if (kind === "BUSINESS" && !kinds.has("BUSINESS_REGISTRATION")) {
      throw new BadRequestException("Upload business registration proof");
    }
  }

  private async saveVerificationDocumentFile(
    userId: string,
    document: VerificationDocumentUploadInput,
  ) {
    const extension = this.extensionForMimeType(document.mimeType);
    const bytes = Buffer.from(document.base64Data, "base64");
    if (bytes.length === 0) {
      throw new BadRequestException("Uploaded document is empty");
    }
    if (bytes.length > 8 * 1024 * 1024) {
      throw new BadRequestException("Each document must be 8 MB or smaller");
    }
    const root =
      process.env.VERIFICATION_UPLOAD_DIR ??
      this.defaultVerificationUploadRoot();
    const userFolder = join(root, userId);
    await mkdir(userFolder, { recursive: true });
    const fileName = `${Date.now()}-${randomUUID()}${extension}`;
    const storageKey = join("verification-documents", userId, fileName);
    await writeFile(join(userFolder, fileName), bytes);
    return {
      kind: document.kind as DocumentKind,
      storageKey,
      originalName: document.originalName,
      mimeType: document.mimeType,
    };
  }

  private extensionForMimeType(mimeType: string) {
    switch (mimeType) {
      case "image/jpeg":
        return ".jpg";
      case "image/png":
        return ".png";
      case "image/webp":
        return ".webp";
      case "application/pdf":
        return ".pdf";
      default:
        throw new BadRequestException("Unsupported document type");
    }
  }

  private defaultVerificationUploadRoot() {
    const cwd = process.cwd();
    const repoRoot =
      basename(cwd) === "api" && basename(dirname(cwd)) === "apps"
        ? resolve(cwd, "..", "..")
        : cwd;
    return join(repoRoot, "uploads", "verification-documents");
  }

  async requestDeletion(user: User) {
    const executeAfter = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.$transaction([
      this.prisma.accountDeletion.upsert({
        where: { userId: user.id },
        create: { userId: user.id, executeAfter },
        update: { executeAfter, lastError: null },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { status: "DELETION_PENDING" },
      }),
    ]);
    await this.firebase.auth.revokeRefreshTokens(user.firebaseUid);
    return true;
  }

  async deleteNow(user: User, confirmation: string) {
    if (confirmation !== "DELETE")
      throw new BadRequestException(
        "Type DELETE to confirm permanent account deletion",
      );
    await this.firebase.auth.deleteUser(user.firebaseUid);
    await this.prisma.user.delete({ where: { id: user.id } });
    return true;
  }
}
