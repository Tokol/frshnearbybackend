import { Module } from "@nestjs/common";
import { HotSalesResolver } from "./hot-sales.resolver";
import { HotSalesService } from "./hot-sales.service";

@Module({ providers: [HotSalesResolver, HotSalesService] })
export class HotSalesModule {}
