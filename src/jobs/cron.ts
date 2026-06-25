import cron from 'node-cron';
import { prisma } from '../config/prisma.js';
import { notificationService } from '../modules/notifications/notification.service.js';

export function initializeCronJobs() {
  console.log('⏳ Initializing CRON jobs...');

  // 1. Daily Overdue Visits Digest for Nurses & Upcoming Visit Reminder for Patients
  // Runs every morning at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('🏃 Running Daily Overdue Visits and Reminders CRON...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Find patients and their pending visits
      const activePatients = await prisma.patient.findMany({
        where: {
          status: { in: ['registered', 'screened', 'normal', 'high_risk'] },
          edd: { gte: new Date() }, // still pregnant
        },
        include: {
          visits: {
            where: { isCompleted: false, scheduledDate: { not: null } },
            orderBy: { scheduledDate: 'asc' }, // get the very next scheduled visit
          }
        }
      });

      // Group overdue patients by nurse
      const nurseOverdueCounts = new Map<string, number>();

      for (const p of activePatients) {
        if (!p.visits || p.visits.length === 0) continue;
        
        const nextVisit = p.visits[0];
        if (!nextVisit.scheduledDate) continue;

        const visitDate = new Date(nextVisit.scheduledDate);
        visitDate.setHours(0, 0, 0, 0);

        // 1. Patient Notification: Upcoming Visit (Exactly 1 day before)
        if (visitDate.getTime() === tomorrow.getTime()) {
          if (p.userId) {
            await notificationService.notifyPatientUpcomingVisit(p.userId, nextVisit.scheduledDate).catch(console.error);
          }
        }

        // 2. Patient Notification: Overdue Visit (Exactly 1 day after missed visit)
        if (visitDate.getTime() === yesterday.getTime()) {
          if (p.userId) {
            await notificationService.notifyPatientOverdueVisit(p.userId).catch(console.error);
          }
        }

        // 3. Nurse Digest Accumulation (If the visit is any time in the past)
        if (visitDate.getTime() < today.getTime()) {
          if (p.assignedNurse) {
            nurseOverdueCounts.set(p.assignedNurse, (nurseOverdueCounts.get(p.assignedNurse) || 0) + 1);
          }
        }
      }

      // 4. Dispatch daily overdue digest to nurses
      for (const [nurseId, count] of nurseOverdueCounts.entries()) {
        await notificationService.notifyNurseOverdueDigest(nurseId, count).catch(console.error);
      }

    } catch (err) {
      console.error('Error in Overdue Visits CRON:', err);
    }
  });

  // 2. Daily Birth Preparedness for Patients (4 weeks before EDD)
  // Runs every morning at 8:30 AM
  cron.schedule('30 8 * * *', async () => {
    console.log('🏃 Running Birth Preparedness CRON...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + 28); // 4 weeks from today
      
      const targetDateEnd = new Date(targetDate);
      targetDateEnd.setDate(targetDateEnd.getDate() + 1);

      const preppingPatients = await prisma.patient.findMany({
        where: {
          edd: {
            gte: targetDate,
            lt: targetDateEnd
          },
          status: { notIn: ['delivered', 'post_delivery', 'closed'] },
          userId: { not: null }
        }
      });

      for (const patient of preppingPatients) {
        if (patient.userId && patient.edd) {
          await notificationService.notifyPatientBirthPrep(patient.userId, patient.edd);
        }
      }

    } catch (err) {
      console.error('Error in Birth Preparedness CRON:', err);
    }
  });

  console.log('✅ CRON jobs initialized successfully.');
}
