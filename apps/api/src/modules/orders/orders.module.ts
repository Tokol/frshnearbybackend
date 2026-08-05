import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma.module";
import { OrdersResolver } from "./orders.resolver";
import { OrdersService } from "./orders.service";

@Module({ imports: [PrismaModule], providers: [OrdersResolver, OrdersService] })
export class OrdersModule {}
