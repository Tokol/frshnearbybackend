import { Controller, Get, Module } from '@nestjs/common';

@Controller()
class HealthController {
  @Get('health') health() { return { status: 'ok', service: 'frshnearby-api' }; }
  @Get('ready') ready() { return { status: 'ready' }; }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
