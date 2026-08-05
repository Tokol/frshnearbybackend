import { Field, Float, InputType, Int, ObjectType } from "@nestjs/graphql";
import { ArrayMaxSize, ArrayMinSize, IsIn, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { GraphQLISODateTime } from "@nestjs/graphql";

@InputType()
export class OrderItemInput {
  @Field() @IsString() hotSaleId!: string;
  @Field(() => Float) @Min(0.001) @Max(1000000) quantity!: number;
}

@InputType()
export class RequestOrderInput {
  @Field(() => [OrderItemInput])
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items!: OrderItemInput[];

  @Field() @IsIn(["FARM", "REKO"]) pickupType!: string;
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() rekoRingId?: string;
}

@ObjectType()
export class OrderItemView {
  @Field() id!: string;
  @Field() hotSaleId!: string;
  @Field() title!: string;
  @Field() imageMimeType!: string;
  @Field() imageBase64!: string;
  @Field() unit!: string;
  @Field(() => Float) quantityStep!: number;
  @Field(() => Float) quantity!: number;
  @Field(() => Int) unitPriceCents!: number;
  @Field(() => Int) lineTotalCents!: number;
}

@ObjectType()
export class OrderView {
  @Field() id!: string;
  @Field() status!: string;
  @Field() pickupType!: string;
  @Field(() => String, { nullable: true }) rekoRingId!: string | null;
  @Field() pickupName!: string;
  @Field() pickupAddress!: string;
  @Field(() => String, { nullable: true }) pickupSchedule!: string | null;
  @Field() farmName!: string;
  @Field() consumerName!: string;
  @Field(() => String, { nullable: true }) consumerEmail!: string | null;
  @Field(() => String, { nullable: true }) consumerPhone!: string | null;
  @Field(() => Int) totalCents!: number;
  @Field(() => [OrderItemView]) items!: OrderItemView[];
  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => GraphQLISODateTime) updatedAt!: Date;
}

export const sellerTransitions = ["ACCEPTED", "REJECTED", "READY_FOR_PICKUP", "COMPLETED"] as const;

@InputType()
export class UpdateOrderStatusInput {
  @Field() @IsString() id!: string;
  @Field() @IsIn(sellerTransitions) status!: string;
}
