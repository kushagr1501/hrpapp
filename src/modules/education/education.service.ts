import { prisma } from "../../config/prisma.js";
import type { Prisma, ContentType } from "@prisma/client";

export const educationService = {
  async listActiveContent() {
    return prisma.educationalContent.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" }
    });
  },

  async listAllContent() {
    return prisma.educationalContent.findMany({
      orderBy: { createdAt: "desc" }
    });
  },

  async getContentById(id: string) {
    return prisma.educationalContent.findUnique({
      where: { id }
    });
  },

  async createContent(data: Prisma.EducationalContentCreateInput) {
    return prisma.educationalContent.create({
      data
    });
  },

  async updateContent(id: string, data: Prisma.EducationalContentUpdateInput) {
    return prisma.educationalContent.update({
      where: { id },
      data
    });
  },

  async deleteContent(id: string) {
    return prisma.educationalContent.delete({
      where: { id }
    });
  },

  async assignToPatient(patientId: string, contentId: string, assignedBy?: string) {
    return prisma.patientEducation.create({
      data: {
        patientId,
        contentId,
        assignedBy
      },
      include: {
        content: true
      }
    });
  },

  async listForPatient(patientId: string) {
    return prisma.patientEducation.findMany({
      where: { patientId },
      include: { content: true },
      orderBy: { assignedAt: "desc" }
    });
  }
};
