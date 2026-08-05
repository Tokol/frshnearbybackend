import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { User } from "@frsh/database";
import { FirebaseAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { OrdersService } from "./orders.service";
import { OrderView, RequestOrderInput, UpdateOrderStatusInput } from "./orders.types";

@Resolver()
@UseGuards(FirebaseAuthGuard)
export class OrdersResolver {
  constructor(private readonly orders: OrdersService) {}

  @Query(() => [OrderView])
  myOrders(@CurrentUser() user: User) { return this.orders.forConsumer(user); }

  @Query(() => [OrderView])
  sellerOrders(@CurrentUser() user: User) { return this.orders.forSeller(user); }

  @Mutation(() => OrderView)
  requestOrder(@CurrentUser() user: User, @Args("input") input: RequestOrderInput) {
    return this.orders.request(user, input);
  }

  @Mutation(() => OrderView)
  updateOrderStatus(@CurrentUser() user: User, @Args("input") input: UpdateOrderStatusInput) {
    return this.orders.updateStatus(user, input);
  }

  @Mutation(() => OrderView)
  cancelOrder(@CurrentUser() user: User, @Args("id") id: string) {
    return this.orders.cancel(user, id);
  }
}
