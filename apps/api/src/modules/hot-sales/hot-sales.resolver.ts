import { UseGuards } from "@nestjs/common";
import { Args, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import { User } from "@frsh/database";
import { FirebaseAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { HotSalesService } from "./hot-sales.service";
import {
  CreateHotSaleInput,
  HotSaleQuantityInput,
  HotSaleRekoRingView,
  HotSaleView,
  UpdateHotSaleInput,
} from "./hot-sales.types";

@Resolver()
@UseGuards(FirebaseAuthGuard)
export class HotSalesResolver {
  constructor(private readonly hotSales: HotSalesService) {}

  @Query(() => [HotSaleRekoRingView])
  availableRekoRings(@CurrentUser() user: User) {
    return this.hotSales.availableRekoRings(user);
  }

  @Query(() => [HotSaleView])
  myHotSales(@CurrentUser() user: User) {
    return this.hotSales.mine(user);
  }

  @Query(() => [HotSaleView])
  searchHotSales(
    @CurrentUser() user: User,
    @Args("search") search: string,
    @Args("limit", { type: () => Int, defaultValue: 25 }) limit: number,
  ) {
    return this.hotSales.search(user, search, limit);
  }

  @Mutation(() => HotSaleView)
  createHotSale(@CurrentUser() user: User, @Args("input") input: CreateHotSaleInput) {
    return this.hotSales.create(user, input);
  }

  @Mutation(() => HotSaleView)
  updateHotSale(@CurrentUser() user: User, @Args("input") input: UpdateHotSaleInput) {
    return this.hotSales.update(user, input);
  }

  @Mutation(() => HotSaleView)
  setHotSaleQuantity(@CurrentUser() user: User, @Args("input") input: HotSaleQuantityInput) {
    return this.hotSales.setQuantity(user, input);
  }

  @Mutation(() => Boolean)
  archiveHotSale(@CurrentUser() user: User, @Args("id") id: string) {
    return this.hotSales.archive(user, id);
  }
}
