import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.notificationLog.findMany({
    orderBy: { sentAt: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(logs, null, 2));

  const users = await prisma.user.findMany({
    where: { expoPushToken: { not: null } },
    select: { fullName: true, expoPushToken: true }
  });
  console.log('Users with Push Token:', users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
