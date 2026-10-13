import { PrismaService } from '../../src/prisma/prisma.service';

export async function resetDatabase(
    prisma: PrismaService)
{
    return prisma.$executeRaw`TRUNCATE TABLE "User", "UserInviteCode", "UserVerification" RESTART IDENTITY CASCADE`;
}