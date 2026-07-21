import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { User } from '@frsh/database';
import { CurrentUser } from '../auth/current-user.decorator';
import { FirebaseAuthGuard } from '../auth/auth.guard';
import { UserView } from '../auth/auth.types';
import { BusinessProfileInput, ConfirmLocationInput, PersonalProfileInput, ProducerProfileInput, PushInstallationInput, SelectAccountTypeInput, SubmitVerificationInput } from './user.inputs';
import { UsersService } from './users.service';

@Resolver()
@UseGuards(FirebaseAuthGuard)
export class UsersResolver {
  constructor(private readonly users: UsersService) {}
  @Query(() => UserView) me(@CurrentUser() user: User) { return user; }
  @Query(() => Boolean) phoneNumberAvailable(@CurrentUser() user: User, @Args('phone') phone: string) { return this.users.phoneAvailable(user, phone); }
  @Mutation(() => UserView) confirmLocation(@CurrentUser() user: User, @Args('input') input: ConfirmLocationInput) { return this.users.confirmLocation(user, input); }
  @Mutation(() => UserView) updatePersonalProfile(@CurrentUser() user: User, @Args('input') input: PersonalProfileInput) { return this.users.updatePersonal(user, input); }
  @Mutation(() => UserView) selectAccountType(@CurrentUser() user: User, @Args('input') input: SelectAccountTypeInput) { return this.users.selectType(user, input.accountType); }
  @Mutation(() => UserView) saveProducerProfile(@CurrentUser() user: User, @Args('input') input: ProducerProfileInput) { return this.users.saveProducer(user, input); }
  @Mutation(() => UserView) saveBusinessProfile(@CurrentUser() user: User, @Args('input') input: BusinessProfileInput) { return this.users.saveBusiness(user, input); }
  @Mutation(() => UserView) submitForVerification(@CurrentUser() user: User, @Args('input') input: SubmitVerificationInput) { return this.users.submit(user, input); }
  @Mutation(() => Boolean) requestAccountDeletion(@CurrentUser() user: User) { return this.users.requestDeletion(user); }
  @Mutation(() => Boolean) deleteMyAccount(@CurrentUser() user: User, @Args('confirmation') confirmation: string) { return this.users.deleteNow(user, confirmation); }
  @Mutation(() => Boolean) registerPushInstallation(@CurrentUser() user: User, @Args('input') input: PushInstallationInput) { return this.users.registerPushInstallation(user, input); }
  @Mutation(() => Boolean) unregisterPushInstallation(@CurrentUser() user: User, @Args('token') token: string) { return this.users.unregisterPushInstallation(user, token); }
}
