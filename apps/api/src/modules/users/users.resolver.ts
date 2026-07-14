import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { User } from '@frsh/database';
import { CurrentUser } from '../auth/current-user.decorator';
import { FirebaseAuthGuard } from '../auth/auth.guard';
import { UserView } from '../auth/auth.types';
import { BusinessProfileInput, ConfirmLocationInput, PersonalProfileInput, ProducerProfileInput, SelectAccountTypeInput } from './user.inputs';
import { UsersService } from './users.service';

@Resolver()
@UseGuards(FirebaseAuthGuard)
export class UsersResolver {
  constructor(private readonly users: UsersService) {}
  @Query(() => UserView) me(@CurrentUser() user: User) { return user; }
  @Mutation(() => UserView) confirmLocation(@CurrentUser() user: User, @Args('input') input: ConfirmLocationInput) { return this.users.confirmLocation(user, input); }
  @Mutation(() => UserView) updatePersonalProfile(@CurrentUser() user: User, @Args('input') input: PersonalProfileInput) { return this.users.updatePersonal(user, input); }
  @Mutation(() => UserView) selectAccountType(@CurrentUser() user: User, @Args('input') input: SelectAccountTypeInput) { return this.users.selectType(user, input.accountType); }
  @Mutation(() => UserView) saveProducerProfile(@CurrentUser() user: User, @Args('input') input: ProducerProfileInput) { return this.users.saveProducer(user, input); }
  @Mutation(() => UserView) saveBusinessProfile(@CurrentUser() user: User, @Args('input') input: BusinessProfileInput) { return this.users.saveBusiness(user, input); }
  @Mutation(() => UserView) submitForVerification(@CurrentUser() user: User) { return this.users.submit(user); }
  @Mutation(() => Boolean) requestAccountDeletion(@CurrentUser() user: User) { return this.users.requestDeletion(user); }
  @Mutation(() => Boolean) deleteMyAccount(@CurrentUser() user: User, @Args('confirmation') confirmation: string) { return this.users.deleteNow(user, confirmation); }
}
