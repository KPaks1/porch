import { Body, Controller, Post, Get, Version, Query } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { CreateUserDto } from './dto/user/create-user.dto';

@Controller({ path: 'auth' })
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @Post('register')
  @Version('1')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authenticationService.registerUser(createUserDto);
  }

  // Here temporarily to confirm functionality
  @Get('user')
  @Version('1')
  async user(@Query('email') email: string) {
    return this.authenticationService.getUserByEmail(email);
  }
}
