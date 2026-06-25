import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const patientData = {
    age: 28,
    husbandName: 'Mock Husband',
    address: 'Mock Address',
    ward: 'Ward 28',
    status: 'registered',
    isHrp: true,
  };

  const dates = [];
  // Generate dates over the last 5 months
  for(let i=0; i<35; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - Math.floor(Math.random() * 5));
    d.setDate(Math.floor(Math.random() * 28) + 1);
    dates.push(d);
  }

  // Create mock patients
  for(let i=0; i<dates.length; i++) {
    const severity = Math.random() > 0.8 ? 'critical' : Math.random() > 0.5 ? 'high' : 'moderate';
    await prisma.patient.create({
      data: {
        ...patientData,
        fullName: 'Mock Patient ' + i,
        phone: '+9199' + Math.floor(10000000 + Math.random() * 90000000).toString(),
        createdAt: dates[i],
        updatedAt: dates[i],
        riskSeverity: severity
      }
    });
  }

  console.log('Inserted ' + dates.length + ' backdated mock patients');
}

run().catch(console.error).finally(() => prisma.$disconnect());
