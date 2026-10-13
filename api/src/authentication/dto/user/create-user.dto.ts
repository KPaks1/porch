import { ApiProperty } from '@nestjs/swagger';
import { strict } from 'assert';

export class CreateUserDto {
  @ApiProperty({
    type: String,
    description: 'The email of the user, you will use this to log in',
    required: true,
  })
  email: string;

  @ApiProperty({
    type: String,
    description: 'The password of the user',
    required: true,
  })
  password: string;

  @ApiProperty({
    type: String,
    description: 'The display name of the user',
    required: true,
  })
  displayName: string;

  @ApiProperty({
    type: String,
    description:
      'The invite code the user has received from another registered user',
    required: true,
  })
  inviteCode: string;
}
