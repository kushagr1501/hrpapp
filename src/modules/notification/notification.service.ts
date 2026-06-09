import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";

type PushPayload = {
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  template: string;
  patientId?: string;
};

async function writeLog(input: {
  userId: string;
  patientId?: string;
  template: string;
  status: string;
  metadata?: Prisma.InputJsonObject;
}) {
  await prisma.notificationLog.create({
    data: {
      userId: input.userId,
      patientId: input.patientId,
      channel: "expo_push",
      template: input.template,
      status: input.status,
      metadata: input.metadata
    }
  });
}

export const notificationService = {
  async sendPushToUser(userId: string, payload: PushPayload) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        expoPushToken: true
      }
    });

    if (!user?.expoPushToken) {
      await writeLog({
        userId,
        patientId: payload.patientId,
        template: payload.template,
        status: "skipped",
        metadata: {
          reason: "missing_expo_push_token",
          title: payload.title
        }
      });
      return;
    }

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          to: user.expoPushToken,
          sound: "default",
          title: payload.title,
          body: payload.body,
          data: payload.data
        })
      });

      const responseBody = await response.json().catch(() => null);

      await writeLog({
        userId,
        patientId: payload.patientId,
        template: payload.template,
        status: response.ok ? "sent" : "failed",
        metadata: {
          title: payload.title,
          expoResponse: responseBody
        }
      });
    } catch (error) {
      await writeLog({
        userId,
        patientId: payload.patientId,
        template: payload.template,
        status: "failed",
        metadata: {
          title: payload.title,
          error: error instanceof Error ? error.message : "Unknown push error"
        }
      });
    }
  },

  async notifyAlert(alertId: string) {
    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
      include: {
        patient: true
      }
    });

    if (!alert) {
      return;
    }

    await this.sendPushToUser(alert.assignedTo, {
      title: alert.title,
      body: alert.message ?? undefined,
      template: `alert.${alert.alertType}`,
      patientId: alert.patientId ?? undefined,
      data: {
        alertId: alert.id,
        alertType: alert.alertType,
        patientId: alert.patientId,
        route: `/patients/${alert.patientId}`
      }
    });
  }
};
