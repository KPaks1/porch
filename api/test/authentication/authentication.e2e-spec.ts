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

  it('/auth/register - Post - Success', async () => {
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

  it('/auth/register - Post - Conflict', async () => {
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
          detail: 'An account with this email already exists',
          instance: '/v1/auth/register',
          status: 409,
          title: 'Conflict',
          type: 'about:blank',
        }),
      );
  });

  it('/auth/register - Post - Bad Request', async () => {
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
          detail: 'Invalid invite code',
          instance: '/v1/auth/register',
          status: 400,
          title: 'Bad Request',
          type: 'about:blank',
        }),
      );
  });

  it('/auth/login - Post - Success', async () => {
    const dto: LoginUserDto = {
      email: FOUNDER_EMAIL,
      password: FOUNDER_PASSWORD_RAW,
    };

    return request(app.getHttpServer())
      .post('/v1/auth/login')
      .send(dto)
      .expect(200)
      .expect((res) => {
        expect(typeof res.body.accessToken).toBe('string');

        const cookies = res.headers['set-cookie'] as unknown as
          string[] | undefined;

        const authCookie = cookies?.find((c) => c.startsWith('access_token='));

        expect(authCookie).toBeDefined();
        expect(authCookie).toContain('HttpOnly');
        expect(authCookie).toContain('SameSite=Lax');
        expect(authCookie).not.toContain('Secure');

        const cookieValue = authCookie!.split(';')[0].split('=')[1];
        expect(cookieValue).toBe(res.body.accessToken);
      });
  });

  it('/auth/login - Post - Fail - Wrong pw', async () => {
    const dto: LoginUserDto = {
      email: FOUNDER_EMAIL,
      password: 'fakepasswordthatfails',
    };

    return request(app.getHttpServer())
      .post('/v1/auth/login')
      .send(dto)
      .expect(401)
      .expect((res) => {
        expect(res.headers['set-cookie']).toBeUndefined();
      });
  });

  it('/auth/login - Post - Success - Uppercase email', async () => {
    const dto: LoginUserDto = {
      email: FOUNDER_EMAIL.toUpperCase(),
      password: FOUNDER_PASSWORD_RAW,
    };

    return request(app.getHttpServer())
      .post('/v1/auth/login')
      .send(dto)
      .expect(200)
      .expect((res) => {
        expect(typeof res.body.accessToken).toBe('string');

        const cookies = res.headers['set-cookie'] as unknown as
          string[] | undefined;

        const authCookie = cookies?.find((c) => c.startsWith('access_token='));

        expect(authCookie).toBeDefined();
        expect(authCookie).toContain('HttpOnly');
        expect(authCookie).toContain('SameSite=Lax');
        expect(authCookie).not.toContain('Secure');

        const cookieValue = authCookie!.split(';')[0].split('=')[1];
        expect(cookieValue).toBe(res.body.accessToken);
      });
  });

  it('/auth/login - Post - Fail - Valid, but wrong email', async () => {
    const dto: LoginUserDto = {
      email: 'fakeemail@thatfa.ils',
      password: 'fakepasswordthatfails',
    };

    return request(app.getHttpServer())
      .post('/v1/auth/login')
      .send(dto)
      .expect(401);
  });

  it('/auth/login - Post - Fail - Invalid email input', async () => {
    const dto: LoginUserDto = {
      email: 'fakeemailthatfails',
      password: 'fakepasswordthatfails',
    };

    return await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send(dto)
      .expect(400)
      .expect((res) => {
        expect(res.body).toMatchObject({
          detail: 'The request is invalid.',
          instance: '/v1/auth/login',
          status: 400,
          title: 'Bad Request',
          type: 'about:blank',
        });
        expect(res.body.errors).toContainEqual({
          field: 'email',
          message: 'Please enter a valid email address',
        });
      });
  });

  it('/auth/login - Post - Fail - Blocked by rate limit', async () => {
    const dto: LoginUserDto = {
      email: 'fakeemail@porch.local',
      password: 'invalidpassword',
    };

    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send(dto)
        .expect(401);
    }

    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send(dto)
      .expect(429);
  });

  afterEach(async () => {
    await app?.close();
  });
});
