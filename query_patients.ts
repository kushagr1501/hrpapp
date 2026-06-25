import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const nurse = await prisma.user.findFirst({ where: { email: 'n@gmail.com' } });
  console.log('Nurse:', nurse?.id, nurse?.facilityId);
  const allPatients = await prisma.patient.count();
  const assignedPatients = await prisma.patient.count({ where: { assignedNurse: nurse?.id } });
  const facilityPatients = await prisma.patient.count({ where: { facilityId: nurse?.facilityId } });
  console.log({ allPatients, assignedPatients, facilityPatients });
}

main().catch(console.error).finally(() => prisma.$disconnect());
