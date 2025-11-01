import { Router } from "express";
import { PatientController } from "@/controllers/patient.controller";
const router = Router();
const patientController = new PatientController();
router.post("/", patientController.createPatient);
router.get("/:id", patientController.getPatientById);
router.post("/:id/abdm/link", patientController.linkABDM);
export default router;
