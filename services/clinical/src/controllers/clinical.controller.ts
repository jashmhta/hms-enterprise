import { Request, Response } from "express";
import { ClinicalService } from "@/services/clinical.service";
export class ClinicalController {
  private clinicalService: ClinicalService;
  constructor() { this.clinicalService = new ClinicalService(); }
  async createEncounter(req: Request, res: Response) {
    try { const encounter = await this.clinicalService.createEncounter(req.body);
      res.json({ success: true, data: encounter });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }
  async getEncounterById(req: Request, res: Response) {
    try { const encounter = await this.clinicalService.getEncounterById(req.params.id);
      res.json({ success: true, data: encounter });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }
  async addDiagnosis(req: Request, res: Response) {
    try { const diagnosis = await this.clinicalService.addDiagnosis(req.params.encounterId, req.body);
      res.json({ success: true, data: diagnosis });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }
  async createPrescription(req: Request, res: Response) {
    try { const prescription = await this.clinicalService.createPrescription(req.params.encounterId, req.body);
      res.json({ success: true, data: prescription });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }
  async getPatientMedicalHistory(req: Request, res: Response) {
    try { const history = await this.clinicalService.getPatientMedicalHistory(req.params.patientId);
      res.json({ success: true, data: history });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }
  async addVitals(req: Request, res: Response) {
    try { const vitals = await this.clinicalService.addVitals(req.params.patientId, req.body);
      res.json({ success: true, data: vitals });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }
}
