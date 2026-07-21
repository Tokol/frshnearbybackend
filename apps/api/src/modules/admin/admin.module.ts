import { Module } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AdminResolver } from './admin.resolver';
import { AdminService } from './admin.service';
import { SuperAdminGuard } from './super-admin.guard';
import { PushNotificationService } from './push-notification.service';

@Module({ providers: [AdminGuard, SuperAdminGuard, AdminResolver, AdminService, PushNotificationService] })
export class AdminModule {}
