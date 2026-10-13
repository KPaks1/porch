import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { minutes, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import Joi from 'joi';
import { HealthModule } from './health/health.module';
import { AuthenticationModule } from './authentication/authentication.module';
import { PrismaModule } from './prisma/prisma.module';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: minutes(1),
        limit: 100,
      },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        JWT_SECRET: Joi.string().required(),
        PORT: Joi.number().default(3000),
      }),
    }),
    PrismaModule,
    HealthModule,
    AuthenticationModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
