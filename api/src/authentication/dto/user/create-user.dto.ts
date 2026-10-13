import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    type: String,
    description: 'The email of the user, you will use this to log in',
    required: true,
  })
  @IsEmail({}, {message: 'Please enter a valid email address'})
  email: string;

  @ApiProperty({
    type: String,
    description: 'The password of the user',
    required: true,
  })
  @IsString()
  @Length(12, 72, {message: 'Password must be between 12 and 72 characters'})
  password: string;

  @ApiProperty({
    type: String,
    description: 'The display name of the user',
    required: true,
  })
  @IsString()
  @Length(4, 50, {message: 'Display name must be between 4 and 50 characters'})
  displayName: string;

  @ApiProperty({
    type: String,
    description:
      'The invite code the user has received from another registered user',
    required: true,
  })
  @IsString()
  @Matches(/^[A-Z]{4}\d{4}$/, {
    message: 'The invite code entered does not match the expected format',
  })
  inviteCode: string;
}
