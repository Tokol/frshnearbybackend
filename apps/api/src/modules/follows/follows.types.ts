import { Field, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class FarmFollowStateView {
  @Field() farmId!: string;
  @Field() followed!: boolean;
  @Field(() => Int) followerCount!: number;
}

@ObjectType()
export class FarmNotificationView {
  @Field() id!: string;
  @Field() type!: string;
  @Field() message!: string;
  @Field() actorName!: string;
  @Field() read!: boolean;
  @Field(() => Date) createdAt!: Date;
}
