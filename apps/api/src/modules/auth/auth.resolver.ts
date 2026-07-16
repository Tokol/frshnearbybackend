import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { User } from "@frsh/database";
import { CurrentUser } from "./current-user.decorator";
import { FirebaseAuthGuard } from "./auth.guard";
import {
  EmailSignupInput,
  EmailSignupResult,
  EmailVerificationChallengeType,
  ResendEmailSignupCodeInput,
  SessionType,
  VerifyEmailSignupInput,
} from "./auth.types";
import { AuthService } from "./auth.service";

@Resolver()
export class AuthResolver {
  constructor(private readonly auth: AuthService) {}
  @Query(() => SessionType)
  @UseGuards(FirebaseAuthGuard)
  async session(@CurrentUser() user: User): Promise<SessionType> {
    return { accessGranted: true, user: await this.auth.sessionUser(user.id) };
  }

  @Mutation(() => EmailVerificationChallengeType)
  requestEmailSignup(@Args("input") input: EmailSignupInput) {
    return this.auth.requestEmailSignup(input);
  }

  @Mutation(() => EmailVerificationChallengeType)
  resendEmailSignupCode(@Args("input") input: ResendEmailSignupCodeInput) {
    return this.auth.resendEmailSignupCode(input);
  }

  @Mutation(() => EmailSignupResult)
  verifyEmailSignup(@Args("input") input: VerifyEmailSignupInput) {
    return this.auth.verifyEmailSignup(input);
  }
}
