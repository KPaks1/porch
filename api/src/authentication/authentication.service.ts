import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/user/create-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { generateTokenHash } from './token';

@Injectable()
export class AuthenticationService {
  /** Crockford base32: no I, L, O, U, so codes can't be misread or mistyped. */
  private static readonly INVITE_CODE_ALPHABET =
    '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  private static readonly INVITE_CODE_LENGTH = 8;

  constructor(private readonly prismaService: PrismaService) {}

  async registerUser(createUserDto: CreateUserDto) {
    // Existing email check
    const existing = await this.prismaService.user.findUnique({
      where: { email: createUserDto.email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    // Generate password hash
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    try {
      const createdUser = await this.prismaService.$transaction(async (tx) => {
        // Try find active invite code
        const inviteCode = await tx.userInviteCode.findUnique({
          where: { code: createUserDto.inviteCode, revokedAt: null },
          select: {
            id: true,
            user: {
              select: {
                id: true,
                inviteLimit: true,
              },
            },
          },
        });

        if (!inviteCode) {
          throw new BadRequestException('Invalid invite code');
        }

        // Try increment used invite counter by 1
        const rows = await tx.user.updateMany({
          where: {
            id: inviteCode.user.id,
            invitesUsed: { lt: tx.user.fields.inviteLimit },
          },
          data: { invitesUsed: { increment: 1 } },
        });

        if (rows.count === 0) {
          throw new BadRequestException('Invalid invite code');
        }

        // Create the new user and invite code and return it
        const user = await tx.user.create({
          data: {
            email: createUserDto.email,
            passwordHash: passwordHash,
            displayName: createUserDto.displayName,
            inviteCodeId: inviteCode.id,
            invitedById: inviteCode.user.id,
            inviteCodes: {
              create: { code: this.generateInviteCode() },
            },
            userVerification: {
              create: {
                tokenHash: generateTokenHash(),
                expiresAt: this.generateTokenExpiryDate(),
              },
            },
          },
          omit: { id: true, invitedById: true, inviteCodeId: true, createdAt: true, updatedAt: true }
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

      if (code !== '40001' && code !== '40P01')
        throw new BadRequestException(error);
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

  generateTokenExpiryDate() {
    // 48 hours
    return new Date(Date.now() + 48 * 60 * 60 * 1000);
  }

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
}
