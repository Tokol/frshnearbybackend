import { Field, Float, InputType, Int, ObjectType } from "@nestjs/graphql";
import {
  ArrayMaxSize,
  IsArray,
  IsBase64,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from "class-validator";

const units = [
  "KILOGRAM",
  "GRAM",
  "LITRE",
  "PIECE",
  "BUNCH",
  "BOX",
  "DOZEN",
  "OTHER",
];

@ObjectType()
export class HotSaleScheduleView {
  @Field(() => String) frequency!: string;
  @Field(() => Int) weekday!: number;
  @Field(() => String) startTime!: string;
  @Field(() => String) endTime!: string;
  @Field(() => String) timezone!: string;
}

@ObjectType()
export class HotSaleRekoRingView {
  @Field(() => String) id!: string;
  @Field(() => String) name!: string;
  @Field(() => String) country!: string;
  @Field(() => String) countryCode!: string;
  @Field(() => String, { nullable: true }) regionCode?: string | null;
  @Field(() => String, { nullable: true }) regionName?: string | null;
  @Field(() => String) municipality!: string;
  @Field(() => String) addressLine!: string;
  @Field(() => String, { nullable: true }) postalCode?: string | null;
  @Field(() => Int) priority!: number;
  @Field(() => HotSaleScheduleView, { nullable: true })
  schedule?: HotSaleScheduleView | null;
}

@ObjectType()
export class HotSaleTranslationView {
  @Field(() => String) locale!: string;
  @Field(() => String) title!: string;
  @Field(() => String) description!: string;
  @Field(() => String, { nullable: true }) productionDetail?: string | null;
  @Field(() => String) status!: string;
  @Field(() => String, { nullable: true }) provider?: string | null;
  @Field(() => String, { nullable: true }) model?: string | null;
}

@ObjectType()
export class HotSaleView {
  @Field(() => String) id!: string;
  @Field(() => String, { nullable: true }) productKey?: string | null;
  @Field(() => String, { nullable: true }) variantKey?: string | null;
  @Field(() => String) categoryKey!: string;
  @Field(() => String) originalLanguage!: string;
  @Field(() => String, { nullable: true }) detectedLanguage?: string | null;
  @Field(() => String) originalTitle!: string;
  @Field(() => String) description!: string;
  @Field(() => String, { nullable: true }) productionDetail?: string | null;
  @Field(() => String) unit!: string;
  @Field(() => String, { nullable: true }) customUnit?: string | null;
  @Field(() => Int) priceCents!: number;
  @Field(() => Float) quantity!: number;
  @Field(() => Date, { nullable: true }) producedAt?: Date | null;
  @Field(() => Boolean) availableAtFarm!: boolean;
  @Field(() => String) status!: string;
  @Field(() => String) imageName!: string;
  @Field(() => String) imageMimeType!: string;
  @Field(() => String) imageBase64!: string;
  @Field(() => [HotSaleTranslationView])
  translations!: HotSaleTranslationView[];
  @Field(() => [HotSaleRekoRingView]) rekoRings!: HotSaleRekoRingView[];
  @Field(() => Date) createdAt!: Date;
  @Field(() => Date) updatedAt!: Date;
}

@InputType()
export class CreateHotSaleInput {
  @Field(() => String) @IsString() @Length(2, 12) originalLanguage!: string;
  @Field(() => String) @IsString() @Length(2, 160) originalTitle!: string;
  @Field(() => String) @IsString() @Length(3, 1200) description!: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(2, 300)
  productionDetail?: string;
  @Field(() => String) @IsIn(units) unit!: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 40)
  customUnit?: string;
  @Field(() => Int) @IsInt() @Min(1) @Max(100000000) priceCents!: number;
  @Field(() => Float) @Min(0) @Max(1000000) quantity!: number;
  @Field(() => Date, { nullable: true }) @IsOptional() producedAt?: Date;
  @Field(() => Boolean) @IsBoolean() availableAtFarm!: boolean;
  @Field(() => [String])
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  rekoRingIds!: string[];
  @Field(() => String) @IsString() @Length(1, 180) imageName!: string;
  @Field(() => String)
  @IsIn(["image/jpeg", "image/png", "image/webp"])
  imageMimeType!: string;
  @Field(() => String) @IsBase64() imageBase64!: string;
}

@InputType()
export class UpdateHotSaleInput extends CreateHotSaleInput {
  @Field(() => String) @IsString() id!: string;
}

@InputType()
export class HotSaleQuantityInput {
  @Field(() => String) @IsString() id!: string;
  @Field(() => Float) @Min(0) @Max(1000000) quantity!: number;
}

@InputType()
export class HotSaleAvailabilityInput {
  @Field(() => String) @IsString() id!: string;
  @Field(() => Boolean) @IsBoolean() available!: boolean;
}
