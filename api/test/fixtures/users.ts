import { PrismaService } from '../../src/prisma/prisma.service';
import {
  FOUNDER_DISPLAY_NAME,
  FOUNDER_EMAIL,
  FOUNDER_INVITE_CODE,
  FOUNDER_INVITE_LIMIT,
  FOUNDER_VERFIFY_EXP_DATE,
  FOUNDER_VERFIFY_AT_DATE,
  FOUNDER_PASSWORD_RAW,
  FOUNDER_PASSWORD_HASH,
} from './constants';

type UserOverrides = {
  email?: string;
  displayName?: string;
  inviteCode?: string;
  inviteLimit?: number;
  invitesUsed?: number;
  expiresAt?: Date;
  verifiedAt?: Date;
};

/**
 * Creates a verified founder (no inviter) who owns one active invite code.
 * Pass overrides for edge cases, e.g. `{ inviteLimit: 1 }` or `{ invitesUsed: 3 }`.
 */
export async function createUser(
  prisma: PrismaService,
  overrides: UserOverrides = {},
) {
  const {
    email = overrides.email ?? FOUNDER_EMAIL,
    displayName = overrides.displayName ?? FOUNDER_DISPLAY_NAME,
    inviteCode = overrides.inviteCode ?? FOUNDER_INVITE_CODE,
    inviteLimit = overrides.inviteLimit,
    invitesUsed = overrides.invitesUsed,
    expiresAt = overrides.expiresAt,
    verifiedAt = overrides.verifiedAt,
  } = overrides;

  return prisma.user.create({
    data: {
      email,
      displayName,
      passwordHash: FOUNDER_PASSWORD_HASH,
      inviteLimit,
      invitesUsed,
      userVerification: {
        create: {
          tokenHash: `founder-verification-${email}`,
          expiresAt: expiresAt ?? new Date(),
          verifiedAt: verifiedAt,
        },
      },
      inviteCodes: { create: { code: inviteCode } },
    },
    include: { inviteCodes: true },
  });
}
export async function createFounder(
  prisma: PrismaService,
  overrides: UserOverrides = {
    email: FOUNDER_EMAIL,
    displayName: FOUNDER_DISPLAY_NAME,
    inviteCode: FOUNDER_INVITE_CODE,
    inviteLimit: FOUNDER_INVITE_LIMIT,
    invitesUsed: 0,
    expiresAt: FOUNDER_VERFIFY_EXP_DATE,
    verifiedAt: FOUNDER_VERFIFY_AT_DATE,
  },
) {
  return await createUser(prisma, overrides);
}
