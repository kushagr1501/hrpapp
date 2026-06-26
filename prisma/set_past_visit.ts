import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const patient = await prisma.patient.findFirst({
    where: { phone: '1111111111' }, // Or just grab the first one
    include: { visits: true }
  });

  if (!patient) {
    console.log("No patient found!");
    return;
  }

  // Find an uncompleted visit, or the anc_2 visit
  const visit = patient.visits.find(v => !v.isCompleted) || patient.visits[0];

  if (!visit) {
    console.log("Patient has no visits");
    return;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(10, 0, 0, 0);

  await prisma.visit.update({
    where: { id: visit.id },
    data: {
      scheduledDate: yesterday,
      windowStart: yesterday,
      windowEnd: yesterday,
      isCompleted: false,
    }
  });

  console.log(`Successfully updated visit ${visit.visitType} for patient ${patient.fullName} to yesterday!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
