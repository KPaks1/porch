import { Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/user/create-user.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthenticationService {
  /** Crockford base32: no I, L, O, U, so codes can't be misread or mistyped. */
  private static readonly INVITE_CODE_ALPHABET =
    '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  private static readonly INVITE_CODE_LENGTH = 8;

  constructor(private readonly prismaService: PrismaService) {}

  async registerUser(createUserDto: CreateUserDto) {
    const inviteCodeIsValid = await this.inviteCodeIsValid(
      createUserDto.inviteCode,
    );

    if (!inviteCodeIsValid) {
      throw new Error(
        'Invalid invite code or inviter has reached their limit of invites.',
      );
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    try {
      const createdUser = await this.prismaService.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: createUserDto.email,
            passwordHash: passwordHash,
            displayName: createUserDto.displayName,
            inviteCodes: { create: { code: this.generateInviteCode() } },
          },
        });

        return user;
      });

      return createdUser;
    } catch (error) {
      const source =
        error instanceof Error && error.cause ? error.cause : error;

      const code =
        typeof source === 'object' && source && 'sqlState' in source
          ? source.sqlState
          : null;

      if (code !== '40001' && code !== '40P01') throw error;
    }
  }

  async getUserByEmail(email: string) {
    const user = await this.prismaService.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        displayName: true,
        bio: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException();

    return user;
  }

  // Private methods ----------------------

  generateInviteCode() {
    const characters = AuthenticationService.INVITE_CODE_ALPHABET;
    let inviteCode = '';

    for (let i = 0; i < AuthenticationService.INVITE_CODE_LENGTH; i++) {
      inviteCode += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }

    return inviteCode;
  }

  async inviteCodeIsValid(inviteCode: string) {
    const inviter = await this.prismaService.userInviteCode.findUnique({
      where: {
        code: inviteCode,
        revokedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            inviteLimit: true,
            _count: {
              select: { invitees: true },
            },
          },
        },
      },
    });

    if (!inviter) {
      return false;
    } else {
      if (inviter.user._count.invitees >= inviter.user.inviteLimit) {
        return false;
      }
    }

    return true;
  }
}
