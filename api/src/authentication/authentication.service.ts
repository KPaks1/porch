import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/user/create-user.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthenticationService {
  /** Crockford base32: no I, L, O, U, so codes can't be misread or mistyped. */
  private static readonly INVITE_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  private static readonly INVITE_CODE_LENGTH = 8;

  constructor(private readonly prismaService: PrismaService) {}

  async registerUser(createUserDto: CreateUserDto) {
    // confirm user with invite code exists and they haven't reached their limit
    
    if (await this.validateNewUserDetails(createUserDto) == false) {
      throw new Error('Invalid user data');
    }   

    if (await this.inviteCodeIsValid(createUserDto.inviteCode)) {
      const passwordHash = await bcrypt.hash(createUserDto.password, 10);

      const user = await this.prismaService.user.create({
        data: {
          email: createUserDto.email,
          passwordHash: passwordHash,
          displayName: createUserDto.displayName,
        },
      });

      await this.prismaService.userInviteCode.create({
        data: {
          code: this.generateInviteCode(),
          user: {
            connect: { id: user.id },
          },
        },
      });

      return user;
    }
  }

  generateInviteCode() {
    const characters = AuthenticationService.INVITE_CODE_ALPHABET;
    let inviteCode = '';
    
    for (let i = 0; i < AuthenticationService.INVITE_CODE_LENGTH; i++) {
      inviteCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return inviteCode;
  }

  async validateNewUserDetails(newUser: CreateUserDto) {
    // check if user with this email already exists
    if (await this.prismaService.user.count({
        where: {
          email: newUser.email,
        },
      }) != 0){
      throw new Error('User with this email already exists');
      };

    // check if user with this display name already exists
    if (await this.prismaService.user.count({
        where: {
          displayName: newUser.displayName,
        },
      }) != 0){
        throw new Error('User with this display name already exists');
      };
    
    if (await this.inviteCodeIsValid(newUser.inviteCode) == false) {
      throw new Error('Invalid invite code');
    }
    return true;
  }

  async inviteCodeIsValid(inviteCode: string) {
    const inviter = await this.prismaService.userInviteCode.findFirst({
      where: {
        code: inviteCode,
        revokedAt: null
        },
        include: {
        user: {
          select: {
            id: true,
            inviteLimit: true,
            _count: 
            {
              select: {invitees: true}
            },
          },
        },
      },
    });

    if (!inviter) {
      return false;
    }
    else
    {
    // check if the inviter has reached their limit of invites
      const inviteCount = await this.prismaService.user.count({
        where: {
          id: inviter.id,
        },
      });

      if (inviter.user._count.invitees >= inviter.user.inviteLimit) {
        return false;
      }
    }
    
    return true;
  }
}