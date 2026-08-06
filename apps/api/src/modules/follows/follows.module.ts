import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma.module";
import { AdminModule } from "../admin/admin.module";
import { FollowsResolver } from "./follows.resolver";
import { FollowsService } from "./follows.service";

@Module({ imports: [PrismaModule, AdminModule], providers: [FollowsResolver, FollowsService] })
export class FollowsModule {}
