import { Field, InputType } from '@nestjs/graphql';
import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, IsUrl, Length } from 'class-validator';

@InputType()
export class PersonalProfileInput {
  @Field() @IsString() @Length(2, 80) displayName!: string;
  @Field() @IsPhoneNumber() phone!: string;
  @Field() @IsDateString() dateOfBirth!: string;
  @Field({ nullable: true }) @IsOptional() @IsUrl() photoUrl?: string;
}

@InputType()
export class SelectAccountTypeInput {
  @Field() @IsIn(['CONSUMER', 'SIDE_HUSTLER', 'BUSINESS']) accountType!: 'CONSUMER' | 'SIDE_HUSTLER' | 'BUSINESS';
}

@InputType()
export class ProducerProfileInput {
  @Field() @IsString() @Length(2, 100) publicName!: string;
  @Field({ nullable: true }) @IsOptional() @IsString() description?: string;
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
  @Field({ nullable: true }) @IsOptional() @IsString() farmName?: string;
  @Field() @IsString() @IsNotEmpty() businessId!: string;
  @Field({ nullable: true }) @IsOptional() @IsString() vatNumber?: string;
  @Field() @IsString() @IsNotEmpty() businessType!: string;
  @Field() @IsString() @IsNotEmpty() businessAddress!: string;
  @Field() @IsString() @IsNotEmpty() city!: string;
  @Field() @IsString() @IsNotEmpty() postalCode!: string;
  @Field() @IsString() @IsNotEmpty() country!: string;
  @Field({ nullable: true }) @IsOptional() @IsUrl() logoUrl?: string;
}
