import { Field, InputType, Int, ObjectType } from "@nestjs/graphql";
import { IsIn, IsOptional, IsString, Length, Max, Min } from "class-validator";
import { IsEmail } from "class-validator";
import { UserView } from "../auth/auth.types";

@InputType()
export class AdminUsersFilter {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  search?: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  role?: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  verificationStatus?: string;
  @Field(() => Int, { defaultValue: 1 }) @Min(1) page = 1;
  @Field(() => Int, { defaultValue: 25 }) @Min(1) @Max(100) pageSize = 25;
}

@InputType()
export class ReviewVerificationInput {
  @Field() @IsString() submissionId!: string;
  @Field() @IsIn(["VERIFIED", "NEEDS_CHANGES", "REJECTED"]) decision!:
    "VERIFIED" | "NEEDS_CHANGES" | "REJECTED";
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  userMessage?: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  internalNotes?: string;
}

@InputType()
export class GrantAdminInput {
  @Field() @IsEmail() email!: string;
}

@InputType()
export class DeleteUserInput {
  @Field() @IsString() userId!: string;
  @Field() @IsIn(["DELETE"]) confirmation!: "DELETE";
  @Field() @IsString() @Length(10, 500) reason!: string;
}

@InputType()
export class SendOnboardingEmailInput {
  @Field() @IsString() userId!: string;
  @Field() @IsString() @Length(3, 140) subject!: string;
  @Field() @IsString() @Length(10, 4000) message!: string;
}

@ObjectType()
export class AdminUserDetail {
  @Field(() => UserView) user!: UserView;
  @Field(() => [String]) missingFields!: string[];
  @Field(() => Int) completionPercent!: number;
  @Field() canApplyForVerification!: boolean;
}

@ObjectType()
export class AdminUserPage {
  @Field(() => [UserView]) items!: UserView[];
  @Field(() => Int) total!: number;
  @Field(() => Int) page!: number;
  @Field(() => Int) pageSize!: number;
}

@ObjectType()
export class DashboardStats {
  @Field(() => Int) totalUsers!: number;
  @Field(() => Int) consumers!: number;
  @Field(() => Int) consumerOnly!: number;
  @Field(() => Int) sharedAccounts!: number;
  @Field(() => Int) sideHustlers!: number;
  @Field(() => Int) businesses!: number;
  @Field(() => Int) incompleteProfiles!: number;
  @Field(() => Int) draftVerifications!: number;
  @Field(() => Int) pendingVerifications!: number;
  @Field(() => Int) needsChanges!: number;
  @Field(() => Int) verifiedSellers!: number;
  @Field(() => Int) rejectedVerifications!: number;
  @Field(() => Int) suspendedUsers!: number;
}

@ObjectType()
export class VerificationItem {
  @Field() id!: string;
  @Field() kind!: string;
  @Field() status!: string;
  @Field() submittedAt!: Date;
  @Field(() => UserView) applicant!: UserView;
  @Field(() => String, { nullable: true }) publicName?: string;
  @Field(() => String, { nullable: true }) businessId?: string;
  @Field(() => String, { nullable: true }) businessType?: string;
  @Field(() => String, { nullable: true }) city?: string;
  @Field(() => String, { nullable: true }) country?: string;
}
