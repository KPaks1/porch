import { Body, Controller, Post, Get, Version, Query } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { CreateUserDto } from './dto/user/create-user.dto';
import { LoginUserDto } from './dto/user/login-user.dto';

@Controller({ path: 'auth' })
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @Post('register')
  @Version('1')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authenticationService.registerUser(createUserDto);
  }

  @Post('login')
  @Version('1')
  async login(@Body() loginUserDto: LoginUserDto) {
    return this.authenticationService.login(loginUserDto);
  }
}
