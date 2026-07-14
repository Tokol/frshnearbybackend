import { Field, ObjectType } from '@nestjs/graphql';
import { User } from '@frsh/database';

export type AuthenticatedUser = User;

@ObjectType()
export class SessionType {
  @Field() accessGranted!: boolean;
  @Field(() => UserView) user!: UserView;
}

@ObjectType()
export class UserView {
  @Field() id!: string;
  @Field({ nullable: true }) email!: string | null;
  @Field({ nullable: true }) displayName!: string | null;
  @Field({ nullable: true }) phone!: string | null;
  @Field({ nullable: true }) photoUrl!: string | null;
  @Field(() => [String]) roles!: string[];
  @Field() status!: string;
  @Field() onboardingStep!: string;
  @Field() verificationStatus!: string;
  @Field() emailVerified!: boolean;
  @Field() createdAt!: Date;
  @Field() lastLoginAt!: Date;
}
