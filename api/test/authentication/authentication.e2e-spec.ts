import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { configureApp } from '../../src/app.setup';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { CreateUserDto } from '../../src/authentication/dto/user/create-user.dto';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createFounder, createUser } from '../fixtures/users';
import { resetDatabase } from '../fixtures/database';
import {
  FOUNDER_EMAIL,
  FOUNDER_DISPLAY_NAME,
  FOUNDER_INVITE_CODE,
  FOUNDER_PASSWORD_HASH,
  FOUNDER_PASSWORD_RAW,
} from '../fixtures/constants';
import { LoginUserDto } from '../../src/authentication/dto/user/login-user.dto';

describe('AuthenticationController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);

    await resetDatabase(prisma);
    await createFounder(prisma);
  });

  it('/auth/register - Post - Success', () => {
    const dto: CreateUserDto = {
      email: 'test2@porch.local',
      password: 'a-long-password-123',
      displayName: 'Tester1',
      inviteCode: FOUNDER_INVITE_CODE,
    };

    return request(app.getHttpServer())
      .post('/v1/auth/register')
      .send(dto)
      .expect(201)
      .expect((res) => {
        expect(res.body).toMatchObject({
          email: dto.email,
          displayName: dto.displayName,
          bio: null,
          inviteLimit: 3,
          invitesUsed: 0,
        });
        expect(res.body).not.toHaveProperty('id');
        expect(res.body).not.toHaveProperty('passwordHash');
        expect(res.body).not.toHaveProperty('createdAt');
        expect(res.body).not.toHaveProperty('updatedAt');
      });
  });

  it('/auth/register - Post - Conflict', () => {
    const dto: CreateUserDto = {
      email: FOUNDER_EMAIL,
      displayName: FOUNDER_DISPLAY_NAME,
      password: 'a-long-password-123',
      inviteCode: FOUNDER_INVITE_CODE,
    };

    return request(app.getHttpServer())
      .post('/v1/auth/register')
      .send(dto)
      .expect(409)
      .expect((res) =>
        expect(res.body).toMatchObject({
          error: 'Conflict',
          message: 'An account with this email already exists',
          statusCode: 409,
        }),
      );
  });

  it('/auth/register - Post - Bad Request', () => {
    const dto: CreateUserDto = {
      email: 'notarealemail@porch.local',
      displayName: 'Invalid Invite',
      password: 'a-long-password-123',
      inviteCode: 'FAKE3987',
    };

    return request(app.getHttpServer())
      .post('/v1/auth/register')
      .send(dto)
      .expect(400)
      .expect((res) =>
        expect(res.body).toMatchObject({
          message: 'Invalid invite code',
        }),
      );
  });

  it('/auth/login - Post - Success', () => {
    const dto: LoginUserDto = {
      email: FOUNDER_EMAIL,
      password: FOUNDER_PASSWORD_RAW,
    };

    return request(app.getHttpServer())
      .post('/v1/auth/login')
      .send(dto)
      .expect(201);
  });

  it('/auth/login - Post - Fail - Wrong pw', () => {
    const dto: LoginUserDto = {
      email: FOUNDER_EMAIL,
      password: 'fakepasswordthatfails',
    };

    return request(app.getHttpServer())
      .post('/v1/auth/login')
      .send(dto)
      .expect(401);
  });

  it('/auth/login - Post - Success - Uppercase email', () => {
    const dto: LoginUserDto = {
      email: FOUNDER_EMAIL,
      password: 'fakepassword',
    };

    return request(app.getHttpServer())
      .post('/v1/auth/login')
      .send(dto)
      .expect(401);
  });

  it('/auth/login - Post - Fail - Valid, but wrong email', () => {
    const dto: LoginUserDto = {
      email: 'fakeemail@thatfa.ils',
      password: 'fakepasswordthatfails',
    };

    return request(app.getHttpServer())
      .post('/v1/auth/login')
      .send(dto)
      .expect(401);
  });

  it('/auth/login - Post - Fail - Invalid email input', () => {
    const dto: LoginUserDto = {
      email: 'fakeemailthatfails',
      password: 'fakepasswordthatfails',
    };

    return request(app.getHttpServer())
      .post('/v1/auth/login')
      .send(dto)
      .expect(400)
      .expect((res) =>
        expect(res.body.message).toContain(
          'Please enter a valid email address',
        ),
      );
  });

  afterEach(async () => {
    await app?.close();
  });
});
