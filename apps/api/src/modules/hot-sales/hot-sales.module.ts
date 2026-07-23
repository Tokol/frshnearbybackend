import { Module } from "@nestjs/common";
import { HotSalesResolver } from "./hot-sales.resolver";
import { HotSalesService } from "./hot-sales.service";
import { HotSaleTranslatorService } from "./hot-sale-translator.service";

@Module({ providers: [HotSalesResolver, HotSalesService, HotSaleTranslatorService] })
export class HotSalesModule {}
