import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { HealthService } from './health.service';
import { SkipThrottle } from '@nestjs/throttler';

@Controller({ path: 'health', version: VERSION_NEUTRAL })
@SkipThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  status() {
    return this.healthService.healthStatus();
  }
}
