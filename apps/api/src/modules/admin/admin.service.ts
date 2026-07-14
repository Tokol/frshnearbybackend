import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, User } from "@frsh/database";
import { PrismaService } from "../../prisma.module";
import { AdminUsersFilter, ReviewVerificationInput } from "./admin.types";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async users(filter: AdminUsersFilter) {
    const where: Prisma.UserWhereInput = {
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
    });
    if (!submission)
      throw new BadRequestException("Verification submission not found");
    await this.prisma.$transaction([
      this.prisma.verificationSubmission.update({
        where: { id: submission.id },
        data: {
          status: input.decision,
          reviewedById: admin.id,
          reviewedAt: new Date(),
          userMessage: input.userMessage,
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
          reason: input.internalNotes,
          metadata: { submissionId: submission.id },
        },
      }),
    ]);
    return this.prisma.user.findUniqueOrThrow({
      where: { id: submission.applicantId },
    });
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
