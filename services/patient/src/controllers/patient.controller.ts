import { Request, Response } from "express";
import { PatientService } from "@/services/patient.service";
export class PatientController {
  private patientService: PatientService;
  constructor() { this.patientService = new PatientService(); }
  async createPatient(req: Request, res: Response) {
    try { const patient = await this.patientService.createPatient(req.body);
      res.json({ success: true, data: patient });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }
  async getPatientById(req: Request, res: Response) {
    try { const patient = await this.patientService.getPatientById(req.params.id);
      res.json({ success: true, data: patient });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }
  async linkABDM(req: Request, res: Response) {
    try { const { healthId } = req.body;
      const patient = await this.patientService.linkABDMHealthId(req.params.id, healthId);
      res.json({ success: true, data: patient });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }
}
