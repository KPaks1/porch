import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  healthStatus() { return {status: "ok"}; }
}
