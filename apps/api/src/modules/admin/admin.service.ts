import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Prisma, User } from "@frsh/database";
import { PrismaService } from "../../prisma.module";
import { FirebaseService } from "../auth/firebase.service";
import {
  AdminUsersFilter,
  DeleteUserInput,
  ReviewVerificationInput,
  SendOnboardingEmailInput,
} from "./admin.types";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseService,
  ) {}

  async users(filter: AdminUsersFilter) {
    const filters: Prisma.UserWhereInput = {
      ...(filter.search
        ? {
            OR: [
              { email: { contains: filter.search, mode: "insensitive" } },
              { displayName: { contains: filter.search, mode: "insensitive" } },
              { phone: { contains: filter.search } },
              { firebaseUid: { contains: filter.search } },
            ],
          }
        : {}),
      ...(filter.role ? { roles: { has: filter.role as never } } : {}),
      ...(filter.verificationStatus
        ? { verificationStatus: filter.verificationStatus as never }
        : {}),
    };
    const where: Prisma.UserWhereInput = {
      AND: [filters, { NOT: { roles: { hasSome: ["ADMIN", "SUPER_ADMIN"] } } }],
    };
    const skip = (filter.page - 1) * filter.pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: filter.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page: filter.page, pageSize: filter.pageSize };
  }

  staff() {
    return this.prisma.user.findMany({
      where: { roles: { hasSome: ["ADMIN", "SUPER_ADMIN"] } },
      orderBy: { createdAt: "asc" },
    });
  }

  async userDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { producerProfile: true, businessProfile: true },
    });
    if (!user) throw new BadRequestException("User not found");
    const missingFields: string[] = [];
    const required = (value: unknown, label: string) => {
      if (value === null || value === undefined || value === "")
        missingFields.push(label);
    };
    required(user.displayName, "Full name");
    required(user.phone, "Phone number");
    required(user.dateOfBirth, "Date of birth");
    required(user.photoUrl, "Profile photo");
    if (user.roles.includes("SIDE_HUSTLER")) {
      required(user.addressConfirmedAt, "Registered location");
      required(user.producerProfile?.publicName, "Public display name");
      required(user.producerProfile?.productionType, "Production type");
    }
    if (user.roles.includes("BUSINESS")) {
      required(user.addressConfirmedAt, "Registered location");
      required(user.businessProfile?.publicDisplayName, "Public display name");
      required(user.businessProfile?.legalBusinessName, "Legal business name");
      required(user.businessProfile?.businessId, "Business ID");
      required(user.businessProfile?.businessType, "Business type");
    }
    const total =
      4 +
      (user.roles.includes("SIDE_HUSTLER") ? 3 : 0) +
      (user.roles.includes("BUSINESS") ? 5 : 0);
    return {
      user,
      missingFields,
      completionPercent: Math.round(
        ((total - missingFields.length) / total) * 100,
      ),
      canApplyForVerification:
        missingFields.length === 0 &&
        (user.roles.includes("SIDE_HUSTLER") ||
          user.roles.includes("BUSINESS")),
    };
  }

  async sendOnboardingEmail(admin: User, input: SendOnboardingEmailInput) {
    const target = await this.prisma.user.findUnique({
      where: { id: input.userId },
    });
    if (!target?.email)
      throw new BadRequestException("This user has no email address");
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.ONBOARDING_EMAIL_FROM;
    if (!apiKey || !from) {
      throw new ServiceUnavailableException(
        "Email is not configured. Set RESEND_API_KEY and ONBOARDING_EMAIL_FROM on Render.",
      );
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [target.email],
        subject: input.subject,
        text: input.message,
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new ServiceUnavailableException(
        `Email provider rejected the message: ${detail}`,
      );
    }
    const sent = (await response.json()) as { id?: string };
    await this.prisma.adminAuditLog.create({
      data: {
        actorId: admin.id,
        targetId: target.id,
        action: "ONBOARDING_EMAIL_SENT",
        metadata: { subject: input.subject, providerId: sent.id },
      },
    });
    return true;
  }

  async deleteUser(superAdmin: User, input: DeleteUserInput) {
    const target = await this.prisma.user.findUnique({
      where: { id: input.userId },
    });
    if (!target) throw new BadRequestException("User not found");
    if (target.id === superAdmin.id)
      throw new BadRequestException("You cannot delete your own account");
    if (
      target.roles.includes("ADMIN") ||
      target.roles.includes("SUPER_ADMIN")
    ) {
      throw new BadRequestException(
        "Staff accounts cannot be deleted from People & businesses",
      );
    }
    try {
      await this.firebase.auth.deleteUser(target.firebaseUid);
    } catch (error) {
      if ((error as { code?: string }).code !== "auth/user-not-found")
        throw error;
    }
    await this.prisma.$transaction([
      this.prisma.adminAuditLog.create({
        data: {
          actorId: superAdmin.id,
          targetId: target.id,
          action: "USER_PERMANENTLY_DELETED",
          reason: input.reason,
          metadata: {
            email: target.email,
            firebaseUid: target.firebaseUid,
            roles: target.roles,
          },
        },
      }),
      this.prisma.user.delete({ where: { id: target.id } }),
    ]);
    return true;
  }

  async stats() {
    const marketplaceUser = {
      NOT: { roles: { hasSome: ["ADMIN", "SUPER_ADMIN"] as never[] } },
    };
    const [
      totalUsers,
      consumers,
      consumerOnly,
      sharedAccounts,
      sideHustlers,
      businesses,
      incompleteProfiles,
      draftVerifications,
      pendingVerifications,
      needsChanges,
      verifiedSellers,
      rejectedVerifications,
      suspendedUsers,
    ] = await Promise.all([
      this.prisma.user.count({ where: marketplaceUser }),
      this.prisma.user.count({
        where: { ...marketplaceUser, roles: { has: "CONSUMER" } },
      }),
      this.prisma.user.count({
        where: {
          AND: [
            marketplaceUser,
            { roles: { has: "CONSUMER" } },
            { NOT: { roles: { hasSome: ["SIDE_HUSTLER", "BUSINESS"] } } },
          ],
        },
      }),
      this.prisma.user.count({
        where: {
          ...marketplaceUser,
          roles: { hasSome: ["SIDE_HUSTLER", "BUSINESS"] },
        },
      }),
      this.prisma.user.count({ where: { roles: { has: "SIDE_HUSTLER" } } }),
      this.prisma.user.count({ where: { roles: { has: "BUSINESS" } } }),
      this.prisma.user.count({
        where: {
          ...marketplaceUser,
          onboardingStep: { notIn: ["COMPLETE", "SUBMITTED_FOR_REVIEW"] },
        },
      }),
      this.prisma.user.count({ where: { verificationStatus: "DRAFT" } }),
      this.prisma.verificationSubmission.count({
        where: { status: { in: ["SUBMITTED", "IN_REVIEW"] } },
      }),
      this.prisma.user.count({
        where: { verificationStatus: "NEEDS_CHANGES" },
      }),
      this.prisma.user.count({ where: { verificationStatus: "VERIFIED" } }),
      this.prisma.user.count({ where: { verificationStatus: "REJECTED" } }),
      this.prisma.user.count({ where: { status: "SUSPENDED" } }),
    ]);
    return {
      totalUsers,
      consumers,
      consumerOnly,
      sharedAccounts,
      sideHustlers,
      businesses,
      incompleteProfiles,
      draftVerifications,
      pendingVerifications,
      needsChanges,
      verifiedSellers,
      rejectedVerifications,
      suspendedUsers,
    };
  }

  async queue() {
    const submissions = await this.prisma.verificationSubmission.findMany({
      where: { status: { in: ["SUBMITTED", "IN_REVIEW"] } },
      include: {
        applicant: {
          include: { producerProfile: true, businessProfile: true },
        },
        documents: true,
      },
      orderBy: { submittedAt: "asc" },
    });
    return submissions.map((submission) => ({
      ...submission,
      publicName:
        submission.applicant.businessProfile?.publicDisplayName ??
        submission.applicant.producerProfile?.publicName,
      businessId: submission.applicant.businessProfile?.businessId,
      businessType:
        submission.applicant.businessProfile?.businessType ??
        submission.applicant.producerProfile?.productionType,
      city:
        submission.applicant.businessProfile?.city ??
        submission.applicant.producerProfile?.city,
      country:
        submission.applicant.businessProfile?.country ??
        submission.applicant.producerProfile?.country,
    }));
  }

  async review(admin: User, input: ReviewVerificationInput) {
    const submission = await this.prisma.verificationSubmission.findUnique({
      where: { id: input.submissionId },
      include: { applicant: true },
    });
    if (!submission)
      throw new BadRequestException("Verification submission not found");
    const userMessage = input.userMessage?.trim();
    if (
      (input.decision === "NEEDS_CHANGES" || input.decision === "REJECTED") &&
      (!userMessage || userMessage.length < 10)
    ) {
      throw new BadRequestException(
        "Write a clear reason of at least 10 characters for the user",
      );
    }
    await this.prisma.$transaction([
      this.prisma.verificationSubmission.update({
        where: { id: submission.id },
        data: {
          status: input.decision,
          reviewedById: admin.id,
          reviewedAt: new Date(),
          userMessage,
          internalNotes: input.internalNotes,
        },
      }),
      this.prisma.user.update({
        where: { id: submission.applicantId },
        data: {
          verificationStatus: input.decision,
          onboardingStep:
            input.decision === "VERIFIED" ? "COMPLETE" : "SUBMITTED_FOR_REVIEW",
        },
      }),
      this.prisma.adminAuditLog.create({
        data: {
          actorId: admin.id,
          targetId: submission.applicantId,
          action: `VERIFICATION_${input.decision}`,
          reason: userMessage,
          metadata: {
            submissionId: submission.id,
            internalNotes: input.internalNotes,
          },
        },
      }),
    ]);
    const updated = await this.prisma.user.findUniqueOrThrow({
      where: { id: submission.applicantId },
    });
    await this.sendVerificationDecisionEmail(
      submission.applicant,
      input.decision,
      userMessage,
    );
    return updated;
  }

  private async sendVerificationDecisionEmail(
    applicant: User,
    decision: "VERIFIED" | "NEEDS_CHANGES" | "REJECTED",
    reason?: string,
  ) {
    if (!applicant.email) return;
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.ONBOARDING_EMAIL_FROM;
    if (!apiKey || !from) {
      throw new ServiceUnavailableException(
        "The decision was saved, but email is not configured on Render.",
      );
    }
    const firstName = applicant.displayName?.split(" ")[0] || "there";
    const content = {
      VERIFIED: {
        subject: "Your FRSH Nearby seller account is verified",
        heading: "Your seller account has been verified and is ready to use.",
      },
      NEEDS_CHANGES: {
        subject: "Changes requested for your FRSH Nearby profile",
        heading: "Our verification team needs a few changes before approval.",
      },
      REJECTED: {
        subject: "Update on your FRSH Nearby verification",
        heading: "Your seller verification was not approved.",
      },
    }[decision];
    const reasonText = reason
      ? "\n\nMessage from the review team:\n" + reason
      : "";
    const actionText =
      decision === "NEEDS_CHANGES"
        ? ", make the requested changes and submit it again."
        : ".";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [applicant.email],
        subject: content.subject,
        text:
          "Hello " +
          firstName +
          ",\n\n" +
          content.heading +
          reasonText +
          "\n\nSign in to FRSH Nearby to view your profile" +
          actionText +
          "\n\nFRSH Nearby team",
      }),
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(
        "The decision was saved, but the notification email could not be delivered.",
      );
    }
  }

  async setSuspended(
    admin: User,
    targetId: string,
    suspended: boolean,
    reason?: string,
  ) {
    if (admin.id === targetId)
      throw new BadRequestException("You cannot suspend yourself");
    const target = await this.prisma.user.update({
      where: { id: targetId },
      data: { status: suspended ? "SUSPENDED" : "ACTIVE" },
    });
    await this.prisma.adminAuditLog.create({
      data: {
        actorId: admin.id,
        targetId,
        action: suspended ? "USER_SUSPENDED" : "USER_RESTORED",
        reason,
      },
    });
    return target;
  }

  async grantAdmin(superAdmin: User, email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const target = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (!target)
      throw new BadRequestException(
        "This email must sign in to FRSH Nearby once before it can become an administrator",
      );
    if (target.status !== "ACTIVE")
      throw new BadRequestException(
        "Only an active account can become an administrator",
      );
    if (target.roles.includes("ADMIN") || target.roles.includes("SUPER_ADMIN"))
      return target;
    const updated = await this.prisma.user.update({
      where: { id: target.id },
      data: { roles: { push: "ADMIN" } },
    });
    await this.prisma.adminAuditLog.create({
      data: {
        actorId: superAdmin.id,
        targetId: target.id,
        action: "ADMIN_ROLE_GRANTED",
        metadata: { email: normalizedEmail },
      },
    });
    return updated;
  }
}
