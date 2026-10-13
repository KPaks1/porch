import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/user/create-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { generateTokenHash } from './token';
import { LoginUserDto } from './dto/user/login-user.dto';

@Injectable()
export class AuthenticationService {
  /** Crockford base32: no I, L, O, U, so codes can't be misread or mistyped. */
  private static readonly INVITE_CODE_ALPHABET =
    '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  private static readonly INVITE_CODE_LENGTH = 8;

  constructor(private readonly prismaService: PrismaService) {}

  async registerUser(createUserDto: CreateUserDto) {
    // Existing email check
    createUserDto.email = createUserDto.email.trim().toLowerCase();

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
          omit: {
            id: true,
            invitedById: true,
            inviteCodeId: true,
            createdAt: true,
            updatedAt: true,
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

  async login(loginUserDto: LoginUserDto) {
    const user = await this.prismaService.user.findUnique({
      where: { email: loginUserDto.email },
      select: {
        id: true,
        passwordHash: true,
        userVerification: { select: { verifiedAt: true } },
      },
    });

    if (!user) throw new UnauthorizedException('Invalid email or password.');

    const match = await bcrypt.compare(
      loginUserDto.password,
      user.passwordHash,
    );

    if (!match) throw new UnauthorizedException('Invalid email or password.');

    const verified = user.userVerification?.verifiedAt;

    if (!verified)
      throw new UnauthorizedException(
        'User has not verified their email address.',
      );

    return true;
  }

  // Private methods
  generateTokenExpiryDate() {
    return new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
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
