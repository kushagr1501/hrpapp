import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { prisma } from '../../config/prisma.js';

// Create a new Expo SDK client
// optionally providing an access token if you have enabled push security
const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

export const notificationService = {
  /**
   * Send a batch of push notifications using the Expo Server SDK
   */
  async sendPushNotifications(messages: ExpoPushMessage[]) {
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    // Send the chunks to the Expo push notification service.
    // There are different strategies you could use. A simple one is to send one chunk at a time.
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }
    
    return tickets;
  },

  /**
   * Helper to fetch users by ID and return their Expo push tokens
   */
  async getUserPushTokens(userIds: string[]): Promise<string[]> {
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        expoPushToken: { not: null }
      },
      select: { expoPushToken: true }
    });
    
    return users.map(u => u.expoPushToken!).filter(token => Expo.isExpoPushToken(token));
  },

  /**
   * Instant Alert: High Risk Patient Flag (Nurse & Patient)
   */
  async notifyHighRiskFlag(patientId: string, nurseId: string, patientName: string) {
    const tokens = await this.getUserPushTokens([patientId, nurseId]);
    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens.map(token => ({
      to: token,
      sound: 'default',
      title: '⚠️ High Risk Alert',
      body: `Patient ${patientName} has been flagged as High Risk (HRP). Please review their care plan immediately.`,
      data: { route: `/patients/${patientId}`, type: 'HRP_ALERT' },
    }));

    await this.sendPushNotifications(messages);
  },

  /**
   * Instant Alert: Delivery Logged (Nurse only)
   */
  async notifyDeliveryLogged(nurseId: string, patientName: string, patientId: string) {
    const tokens = await this.getUserPushTokens([nurseId]);
    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens.map(token => ({
      to: token,
      sound: 'default',
      title: '👶 Patient Delivery Logged',
      body: `${patientName} has delivered. Postnatal care protocol is now active.`,
      data: { route: `/patients/${patientId}`, type: 'DELIVERY_ALERT' },
    }));

    await this.sendPushNotifications(messages);
  },

  /**
   * CRON Reminder: Nurse Overdue Digest
   */
  async notifyNurseOverdueDigest(nurseId: string, overdueCount: number) {
    const tokens = await this.getUserPushTokens([nurseId]);
    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens.map(token => ({
      to: token,
      sound: 'default',
      title: '📅 Overdue Visits Reminder',
      body: `You have ${overdueCount} patients who missed their checkups. Please follow up today.`,
      data: { route: '/alerts?tab=overdue', type: 'OVERDUE_DIGEST' },
    }));

    await this.sendPushNotifications(messages);
  },

  /**
   * CRON Reminder: Patient Upcoming Visit
   */
  async notifyPatientUpcomingVisit(patientId: string, visitDate: Date) {
    const tokens = await this.getUserPushTokens([patientId]);
    if (tokens.length === 0) return;

    const dateStr = visitDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });

    const messages: ExpoPushMessage[] = tokens.map(token => ({
      to: token,
      sound: 'default',
      title: '🏥 Upcoming Checkup',
      body: `Reminder: You have an Antenatal Checkup scheduled on ${dateStr}. Please visit your health center.`,
      data: { route: '/visits', type: 'UPCOMING_VISIT' },
    }));

    await this.sendPushNotifications(messages);
  },

  /**
   * CRON Reminder: Patient Missed Checkup (Overdue)
   */
  async notifyPatientOverdueVisit(patientId: string) {
    const tokens = await this.getUserPushTokens([patientId]);
    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens.map(token => ({
      to: token,
      sound: 'default',
      title: '⚠️ Missed Checkup',
      body: `You have missed your scheduled Antenatal Checkup. Please visit your healthcare center as soon as possible.`,
      data: { route: '/visits', type: 'OVERDUE_VISIT' },
    }));

    await this.sendPushNotifications(messages);
  },

  /**
   * CRON Reminder: Patient Birth Preparedness (4 weeks before EDD)
   */
  async notifyPatientBirthPrep(patientId: string, edd: Date) {
    const tokens = await this.getUserPushTokens([patientId]);
    if (tokens.length === 0) return;

    const dateStr = edd.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

    const messages: ExpoPushMessage[] = tokens.map(token => ({
      to: token,
      sound: 'default',
      title: '🎒 Birth Preparedness',
      body: `Your delivery date is approaching (${dateStr}). Please review your hospital checklist.`,
      data: { route: '/prep', type: 'BIRTH_PREP' },
    }));

    await this.sendPushNotifications(messages);
  }
};
