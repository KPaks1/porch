import { Body, Controller, Post, Version } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { CreateUserDto } from './dto/user/create-user.dto';

@Controller({ path: 'auth' })
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @Post('register')
  @Version('1')
  register(@Body() createUserDto: CreateUserDto) {
    return this.authenticationService.registerUser(createUserDto);
  }
}
