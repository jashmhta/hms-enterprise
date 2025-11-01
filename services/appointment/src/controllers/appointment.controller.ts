import { Request, Response } from "express";
import { AppointmentService } from "@/services/appointment.service";
export class AppointmentController {
  private appointmentService: AppointmentService;
  constructor() { this.appointmentService = new AppointmentService(); }
  async createAppointment(req: Request, res: Response) {
    try { const appt = await this.appointmentService.createAppointment(req.body);
      res.json({ success: true, data: appt });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }
  async getAppointmentById(req: Request, res: Response) {
    try { const appt = await this.appointmentService.getAppointmentById(req.params.id);
      res.json({ success: true, data: appt });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }
  async getAppointmentsByPatient(req: Request, res: Response) {
    try { const appts = await this.appointmentService.getAppointmentsByPatient(req.params.patientId);
      res.json({ success: true, data: appts });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }
  async updateAppointment(req: Request, res: Response) {
    try { const appt = await this.appointmentService.updateAppointment(req.params.id, req.body);
      res.json({ success: true, data: appt });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }
  async cancelAppointment(req: Request, res: Response) {
    try { const appt = await this.appointmentService.cancelAppointment(req.params.id, req.body.reason);
      res.json({ success: true, data: appt });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }
}
