import { Field, Float, ObjectType } from '@nestjs/graphql';
import { User } from '@frsh/database';

export type AuthenticatedUser = User;

@ObjectType()
export class UserView {
  @Field() id!: string;
  @Field(() => String, { nullable: true }) email!: string | null;
  @Field(() => String, { nullable: true }) displayName!: string | null;
  @Field(() => String, { nullable: true }) phone!: string | null;
  @Field(() => String, { nullable: true }) photoUrl!: string | null;
  @Field(() => String, { nullable: true }) addressLine!: string | null;
  @Field(() => String, { nullable: true }) city!: string | null;
  @Field(() => String, { nullable: true }) postalCode!: string | null;
  @Field(() => String, { nullable: true }) country!: string | null;
  @Field(() => Float, { nullable: true }) latitude!: number | null;
  @Field(() => Float, { nullable: true }) longitude!: number | null;
  @Field(() => Date, { nullable: true }) addressConfirmedAt!: Date | null;
  @Field(() => [String]) roles!: string[];
  @Field() status!: string;
  @Field() onboardingStep!: string;
  @Field() verificationStatus!: string;
  @Field() emailVerified!: boolean;
  @Field() createdAt!: Date;
  @Field() lastLoginAt!: Date;
}

@ObjectType()
export class SessionType {
  @Field() accessGranted!: boolean;
  @Field(() => UserView) user!: UserView;
}
