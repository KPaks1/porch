import { Body, Controller, Post, Version, HttpCode, Res } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { CreateUserDto } from './dto/user/create-user.dto';
import { LoginUserDto } from './dto/user/login-user.dto';
import { minutes, Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller({ path: 'auth' })
export class AuthenticationController {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @Version('1')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authenticationService.registerUser(createUserDto);
  }

  @Post('login')
  @Version('1')
  @HttpCode(200)
  @Throttle({
    default: { limit: 5, ttl: minutes(1) },
  })
  async login(
    @Body() loginUserDto: LoginUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = await this.authenticationService.login(loginUserDto);

    res.cookie('access_token', token.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.configService.get('NODE_ENV') === 'production',
      maxAge: minutes(60),
      path: '/',
    });

    return token;
  }
}
