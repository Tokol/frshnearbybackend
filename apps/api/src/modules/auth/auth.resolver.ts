import { Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { User } from '@frsh/database';
import { CurrentUser } from './current-user.decorator';
import { FirebaseAuthGuard } from './auth.guard';
import { SessionType } from './auth.types';

@Resolver()
export class AuthResolver {
  @Query(() => SessionType)
  @UseGuards(FirebaseAuthGuard)
  session(@CurrentUser() user: User): SessionType { return { accessGranted: true, user }; }
}
