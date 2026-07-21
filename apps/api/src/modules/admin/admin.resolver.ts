import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { User } from "@frsh/database";
import { FirebaseAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { UserView } from "../auth/auth.types";
import { AdminGuard } from "./admin.guard";
import { AdminService } from "./admin.service";
import {
  AdminUserPage,
  AdminUserDetail,
  AdminUsersFilter,
  DashboardStats,
  DeleteUserInput,
  GrantAdminInput,
  RequestUserVerificationInput,
  ReviewVerificationInput,
  SendOnboardingEmailInput,
  VerificationItem,
  VerificationDocumentData,
  VerificationSubmissionView,
} from "./admin.types";
import { SuperAdminGuard } from "./super-admin.guard";

@Resolver()
@UseGuards(FirebaseAuthGuard, AdminGuard)
export class AdminResolver {
  constructor(private readonly admin: AdminService) {}
  @Query(() => DashboardStats) adminDashboardStats() {
    return this.admin.stats();
  }
  @Query(() => AdminUserPage) adminUsers(
    @Args("filter", { type: () => AdminUsersFilter, nullable: true })
    filter?: AdminUsersFilter,
  ) {
    return this.admin.users(filter ?? new AdminUsersFilter());
  }
  @Query(() => [UserView]) adminStaff() {
    return this.admin.staff();
  }
  @Query(() => AdminUserDetail) adminUser(@Args("userId") userId: string) {
    return this.admin.userDetail(userId);
  }
  @Query(() => [VerificationItem]) adminVerificationQueue() {
    return this.admin.queue();
  }
  @Query(() => VerificationDocumentData) adminVerificationDocument(
    @Args("documentId") documentId: string,
  ) {
    return this.admin.documentData(documentId);
  }
  @Mutation(() => UserView) reviewVerification(
    @CurrentUser() user: User,
    @Args("input") input: ReviewVerificationInput,
  ) {
    return this.admin.review(user, input);
  }
  @Mutation(() => VerificationSubmissionView)
  requestUserVerification(
    @CurrentUser() user: User,
    @Args("input") input: RequestUserVerificationInput,
  ) {
    return this.admin.requestVerification(user, input);
  }
  @Mutation(() => UserView) suspendUser(
    @CurrentUser() user: User,
    @Args("userId") userId: string,
    @Args("reason", { type: () => String, nullable: true }) reason?: string,
  ) {
    return this.admin.setSuspended(user, userId, true, reason);
  }
  @Mutation(() => UserView) restoreUser(
    @CurrentUser() user: User,
    @Args("userId") userId: string,
  ) {
    return this.admin.setSuspended(user, userId, false);
  }
  @Mutation(() => UserView)
  @UseGuards(SuperAdminGuard)
  grantAdminRole(
    @CurrentUser() user: User,
    @Args("input") input: GrantAdminInput,
  ) {
    return this.admin.grantAdmin(user, input.email);
  }
  @Mutation(() => Boolean)
  @UseGuards(SuperAdminGuard)
  deleteUserPermanently(
    @CurrentUser() user: User,
    @Args("input") input: DeleteUserInput,
  ) {
    return this.admin.deleteUser(user, input);
  }
  @Mutation(() => Boolean)
  sendOnboardingEmail(
    @CurrentUser() user: User,
    @Args("input") input: SendOnboardingEmailInput,
  ) {
    return this.admin.sendOnboardingEmail(user, input);
  }
}
