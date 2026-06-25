import type { Request, Response } from "express";
import { educationService } from "./education.service.js";

export const educationController = {
  async listActive(request: Request, response: Response) {
    const content = await educationService.listActiveContent();
    response.json({ success: true, data: content });
  },

  async listAll(request: Request, response: Response) {
    const content = await educationService.listAllContent();
    response.json({ success: true, data: content });
  },

  async getById(request: Request, response: Response) {
    const id = request.params.id as string;
    const content = await educationService.getContentById(id);
    if (!content) {
      return response.status(404).json({ success: false, message: "Content not found" });
    }
    response.json({ success: true, data: content });
  },

  async create(request: Request, response: Response) {
    const content = await educationService.createContent(request.body);
    response.status(201).json({ success: true, data: content });
  },

  async update(request: Request, response: Response) {
    const id = request.params.id as string;
    const content = await educationService.updateContent(id, request.body);
    response.json({ success: true, data: content });
  },

  async remove(request: Request, response: Response) {
    const id = request.params.id as string;
    await educationService.deleteContent(id);
    response.json({ success: true, message: "Content deleted successfully" });
  },

  async assign(request: Request, response: Response) {
    const { patientId, contentId } = request.body;
    const data = await educationService.assignToPatient(patientId, contentId, request.user?.id);
    response.status(201).json({ success: true, data });
  },

  async listAssigned(request: Request, response: Response) {
    const patientId = request.params.patientId as string;
    const data = await educationService.listForPatient(patientId);
    response.json({ success: true, data });
  }
};
