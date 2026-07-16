import { Field, Float, InputType, ObjectType } from "@nestjs/graphql";
import { IsEmail, IsString, Length, Matches } from "class-validator";
import { User } from "@frsh/database";

export type AuthenticatedUser = User;

@ObjectType()
export class ProducerProfileView {
  @Field() publicName!: string;
  @Field(() => String, { nullable: true }) description!: string | null;
  @Field(() => String, { nullable: true }) productionType!: string | null;
  @Field(() => String, { nullable: true }) address!: string | null;
  @Field(() => String, { nullable: true }) city!: string | null;
  @Field(() => String, { nullable: true }) postalCode!: string | null;
  @Field(() => String, { nullable: true }) country!: string | null;
}

@ObjectType()
export class BusinessProfileView {
  @Field() publicDisplayName!: string;
  @Field() legalBusinessName!: string;
  @Field(() => String, { nullable: true }) farmName!: string | null;
  @Field() businessId!: string;
  @Field(() => String, { nullable: true }) vatNumber!: string | null;
  @Field() businessType!: string;
  @Field() businessAddress!: string;
  @Field() city!: string;
  @Field() postalCode!: string;
  @Field() country!: string;
  @Field(() => String, { nullable: true }) logoUrl!: string | null;
}

@ObjectType()
export class UserView {
  @Field() id!: string;
  @Field(() => String, { nullable: true }) email!: string | null;
  @Field(() => String, { nullable: true }) displayName!: string | null;
  @Field(() => String, { nullable: true }) phone!: string | null;
  @Field(() => String, { nullable: true }) photoUrl!: string | null;
  @Field(() => Date, { nullable: true }) dateOfBirth!: Date | null;
  @Field(() => String, { nullable: true }) addressLine!: string | null;
  @Field(() => String, { nullable: true }) addressUnit!: string | null;
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
  @Field(() => String, { nullable: true })
  latestVerificationMessage?: string | null;
  @Field() emailVerified!: boolean;
  @Field() createdAt!: Date;
  @Field() lastLoginAt!: Date;
  @Field() updatedAt!: Date;
  @Field(() => ProducerProfileView, { nullable: true })
  producerProfile?: ProducerProfileView | null;
  @Field(() => BusinessProfileView, { nullable: true })
  businessProfile?: BusinessProfileView | null;
}

@ObjectType()
export class SessionType {
  @Field() accessGranted!: boolean;
  @Field(() => UserView) user!: UserView;
}

@InputType()
export class EmailSignupInput {
  @Field() @IsEmail() email!: string;

  @Field()
  @IsString()
  @Length(7, 128)
  @Matches(/[A-Z]/, { message: "password must contain an uppercase letter" })
  @Matches(/[^A-Za-z0-9]/, {
    message: "password must contain a special character",
  })
  password!: string;

  @Field() @IsString() @Length(2, 80) displayName!: string;
}

@InputType()
export class VerifyEmailSignupInput {
  @Field() @IsEmail() email!: string;
  @Field() @IsString() @Length(6, 6) code!: string;
}

@InputType()
export class ResendEmailSignupCodeInput {
  @Field() @IsEmail() email!: string;
}

@ObjectType()
export class EmailVerificationChallengeType {
  @Field() email!: string;
  @Field() expiresAt!: Date;
  @Field() resendAvailableAt!: Date;
}

@ObjectType()
export class EmailSignupResult {
  @Field() customToken!: string;
  @Field(() => UserView) user!: UserView;
}
