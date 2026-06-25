import { FacilityType, UserRole } from "@prisma/client";
import { prisma } from "../src/config/prisma.js";
import { defaultRiskRules } from "../src/modules/risk-engine/default-risk-rules.js";

async function main() {
  const facility = await prisma.facility.upsert({
    where: { id: "fac-001" },
    update: {
      name: "UPHC Rajajinagar",
      type: FacilityType.uphc,
      ward: "Ward 28",
      address: "2nd Cross, Rajajinagar, Bangalore - 560010",
      contactPhone: "+919876543210"
    },
    create: {
      id: "fac-001",
      name: "UPHC Rajajinagar",
      type: FacilityType.uphc,
      ward: "Ward 28",
      address: "2nd Cross, Rajajinagar, Bangalore - 560010",
      contactPhone: "+919876543210"
    }
  });

  const nurse = await prisma.user.upsert({
    where: { phone: "+910000000000" },
    update: {
      fullName: "Demo Nurse",
      email: "nurse@hrp.local",
      role: UserRole.nurse,
      facilityId: facility.id,
      ward: "Ward 28",
      languagePref: "en",
      isActive: true
    },
    create: {
      fullName: "Demo Nurse",
      phone: "+910000000000",
      email: "nurse@hrp.local",
      role: UserRole.nurse,
      facilityId: facility.id,
      ward: "Ward 28",
      languagePref: "en",
      isActive: true
    }
  });

  const patientUser = await prisma.user.upsert({
    where: { phone: "+911234567890" },
    update: {
      fullName: "Kavitha S",
      email: "kavitha@hrp.local",
      role: UserRole.patient,
      facilityId: facility.id,
      ward: "Ward 28",
      languagePref: "en",
      isActive: true
    },
    create: {
      fullName: "Kavitha S",
      phone: "+911234567890",
      email: "kavitha@hrp.local",
      role: UserRole.patient,
      facilityId: facility.id,
      ward: "Ward 28",
      languagePref: "en",
      isActive: true
    }
  });

  const demoPatient = await prisma.patient.findFirst({
    where: {
      OR: [{ userId: patientUser.id }, { phone: patientUser.phone }, { mcpCardNumber: "DEMO-PATIENT-001" }]
    }
  });

  const patientData = {
    fullName: "Kavitha S",
    age: 30,
    phone: patientUser.phone,
    email: patientUser.email,
    husbandName: "Demo Husband",
    address: "Industrial Town Colony",
    ward: "Ward 28",
    slumName: "Industrial Town Colony",
    lmp: new Date("2025-09-14T00:00:00.000Z"),
    edd: new Date("2026-06-21T00:00:00.000Z"),
    gravida: 2,
    para: 1,
    status: "high_risk" as const,
    isHrp: true,
    assignedNurse: nurse.id,
    facilityId: facility.id,
    userId: patientUser.id,
    mcpCardNumber: "DEMO-PATIENT-001"
  };

  const patient = demoPatient
    ? await prisma.patient.update({
        where: { id: demoPatient.id },
        data: patientData
      })
    : await prisma.patient.create({
        data: patientData
      });

  await prisma.birthPlan.upsert({
    where: { patientId: patient.id },
    update: {
      plannedFacility: facility.id,
      plannedDeliveryMode: "facility_delivery",
      transportArranged: true,
      transportType: "ambulance_108",
      emergencyContactName: "Demo Nurse",
      emergencyContactPhone: nurse.phone
    },
    create: {
      patientId: patient.id,
      plannedFacility: facility.id,
      plannedDeliveryMode: "facility_delivery",
      transportArranged: true,
      transportType: "ambulance_108",
      emergencyContactName: "Demo Nurse",
      emergencyContactPhone: nurse.phone
    }
  });

  for (const rule of defaultRiskRules) {
    const existingRule = await prisma.riskRule.findFirst({
      where: { name: rule.name }
    });

    if (existingRule) {
      await prisma.riskRule.update({
        where: { id: existingRule.id },
        data: {
          category: rule.category,
          priority: rule.priority,
          ruleDefinition: rule.ruleDefinition,
          isActive: true,
          description: rule.name
        }
      });
      continue;
    }

    await prisma.riskRule.create({
      data: {
        name: rule.name,
        description: rule.name,
        category: rule.category,
        priority: rule.priority,
        ruleDefinition: rule.ruleDefinition,
        isActive: true
      }
    });
  }

  console.log("Seed complete");
  console.log("Facility:", facility.name);
  console.log("Demo nurse:", nurse.phone);
  console.log("Demo patient:", patientUser.phone);
  console.log("Risk rules:", defaultRiskRules.length);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
