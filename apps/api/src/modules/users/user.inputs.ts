import { Field, Float, InputType } from "@nestjs/graphql";
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  Min,
} from "class-validator";

@InputType()
export class ConfirmLocationInput {
  @Field() @IsString() @Length(3, 200) addressLine!: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  addressUnit?: string;
  @Field() @IsString() @Length(1, 100) city!: string;
  @Field() @IsString() @Length(1, 24) postalCode!: string;
  @Field() @IsString() @Length(2, 100) country!: string;
  @Field(() => Float) @Min(-90) @Max(90) latitude!: number;
  @Field(() => Float) @Min(-180) @Max(180) longitude!: number;
}

@InputType()
export class PersonalProfileInput {
  @Field() @IsString() @Length(2, 80) displayName!: string;
  @Field()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: "phone must use E.164 format, for example +358401234567",
  })
  phone!: string;
  @Field() @IsDateString() dateOfBirth!: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl()
  photoUrl?: string;
}

@InputType()
export class SelectAccountTypeInput {
  @Field() @IsIn(["CONSUMER", "SIDE_HUSTLER", "BUSINESS"]) accountType!:
    "CONSUMER" | "SIDE_HUSTLER" | "BUSINESS";
}

@InputType()
export class ProducerProfileInput {
  @Field() @IsString() @Length(2, 100) publicName!: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
  @Field() @IsString() @IsNotEmpty() productionType!: string;
  @Field() @IsString() @IsNotEmpty() address!: string;
  @Field() @IsString() @IsNotEmpty() city!: string;
  @Field() @IsString() @IsNotEmpty() postalCode!: string;
  @Field() @IsString() @IsNotEmpty() country!: string;
}

@InputType()
export class BusinessProfileInput {
  @Field() @IsString() @Length(2, 100) publicDisplayName!: string;
  @Field() @IsString() @Length(2, 160) legalBusinessName!: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  farmName?: string;
  @Field() @IsString() @IsNotEmpty() businessId!: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  vatNumber?: string;
  @Field() @IsString() @IsNotEmpty() businessType!: string;
  @Field() @IsString() @IsNotEmpty() businessAddress!: string;
  @Field() @IsString() @IsNotEmpty() city!: string;
  @Field() @IsString() @IsNotEmpty() postalCode!: string;
  @Field() @IsString() @IsNotEmpty() country!: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;
}
