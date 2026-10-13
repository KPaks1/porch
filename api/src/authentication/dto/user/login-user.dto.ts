import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({
    type: String,
    description: 'The email of the user, you will use this to log in',
    required: true,
  })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @ApiProperty({
    type: String,
    description: 'The password of the user',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @Length(12, 72, { message: 'Password must be between 12 and 72 characters' })
  password: string;
}
