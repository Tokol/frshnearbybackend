import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { User } from "@frsh/database";
import { FirebaseAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { FollowsService } from "./follows.service";
import { FarmFollowStateView, FarmNotificationView } from "./follows.types";

@Resolver()
@UseGuards(FirebaseAuthGuard)
export class FollowsResolver {
  constructor(private readonly follows: FollowsService) {}
  @Mutation(() => FarmFollowStateView)
  toggleFarmFollow(@CurrentUser() user: User, @Args("farmId") farmId: string) {
    return this.follows.toggle(user, farmId);
  }
  @Query(() => [FarmNotificationView])
  farmNotifications(@CurrentUser() user: User) { return this.follows.notifications(user); }
  @Mutation(() => Boolean)
  markFarmNotificationRead(@CurrentUser() user: User, @Args("id") id: string) {
    return this.follows.markRead(user, id);
  }
}
