import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  await prisma.$transaction(async (tx) => {
  const founder = await tx.user.upsert({
    where: { email: "founder@porch.local" },
    update: {},
    create: {
      email: "founder@porch.local",
      displayName: "Founder",
      passwordHash: "hashedpassword",
      inviteLimit: 10000
    },
  });

  const userVerification = await tx.userVerification.upsert({
    where: { userId: founder.id },
    update: {},
    create: {
      userId: founder.id,
      tokenHash: "hashedtoken", // fake token has for seeding
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  const inviteCode = await tx.userInviteCode.upsert({
    where: { userId: founder.id, code: "FNDR1234" },
    update: {},
    create: {
        userId: founder.id,
        code: "FNDR1234",
    }
  });
});
}  

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
