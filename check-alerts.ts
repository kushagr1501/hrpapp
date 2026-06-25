import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function check() {
  const alerts = await prisma.alert.findMany({
    take: 5
  });
  console.log("Alerts found:", alerts.length);
  if (alerts.length > 0) {
    console.log("First alert ID:", alerts[0].id);
    console.log("First alert:", alerts[0]);
  }
}
check();
