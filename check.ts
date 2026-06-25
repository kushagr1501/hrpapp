import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ where: { role: 'nurse' }});
  console.log("NURSES:");
  for (const u of users) {
    const patients = await prisma.patient.count({ where: { assignedNurse: u.id }});
    console.log(`- ${u.fullName} (${u.phone}) [ID: ${u.id}]: ${patients} patients assigned`);
  }
}
main().finally(() => prisma.$disconnect());
