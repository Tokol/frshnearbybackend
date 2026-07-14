import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { User } from '@frsh/database';
import { FirebaseAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserView } from '../auth/auth.types';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { AdminUserPage, AdminUsersFilter, DashboardStats, GrantAdminInput, ReviewVerificationInput, VerificationItem } from './admin.types';
import { SuperAdminGuard } from './super-admin.guard';

@Resolver()
@UseGuards(FirebaseAuthGuard, AdminGuard)
export class AdminResolver {
  constructor(private readonly admin: AdminService) {}
  @Query(() => DashboardStats) adminDashboardStats() { return this.admin.stats(); }
  @Query(() => AdminUserPage) adminUsers(@Args('filter', { nullable: true }) filter?: AdminUsersFilter) { return this.admin.users(filter ?? new AdminUsersFilter()); }
  @Query(() => [VerificationItem]) adminVerificationQueue() { return this.admin.queue(); }
  @Mutation(() => UserView) reviewVerification(@CurrentUser() user: User, @Args('input') input: ReviewVerificationInput) { return this.admin.review(user, input); }
  @Mutation(() => UserView) suspendUser(@CurrentUser() user: User, @Args('userId') userId: string, @Args('reason', { nullable: true }) reason?: string) { return this.admin.setSuspended(user, userId, true, reason); }
  @Mutation(() => UserView) restoreUser(@CurrentUser() user: User, @Args('userId') userId: string) { return this.admin.setSuspended(user, userId, false); }
  @Mutation(() => UserView)
  @UseGuards(SuperAdminGuard)
  grantAdminRole(@CurrentUser() user: User, @Args('input') input: GrantAdminInput) { return this.admin.grantAdmin(user, input.email); }
}
