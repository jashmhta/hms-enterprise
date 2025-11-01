import { DatabaseService } from "./database.service";
export interface VitalSigns {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
}
export class ClinicalService {
  private db: DatabaseService;
  constructor() { this.db = new DatabaseService(); }
  async createEncounter(data: any) {
    const encounterId = `ENC${Date.now()}`;
    return this.db.query(
      `INSERT INTO clinical_encounters (encounter_id, patient_id, doctor_id, appointment_id, visit_type, chief_complaint)`
      ` VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [encounterId, data.patientId, data.doctorId, data.appointmentId, data.visitType, data.chiefComplaint]
    );
  }
  async getEncounterById(id: string) {
    return this.db.queryOne("SELECT * FROM clinical_encounters WHERE id = $1", [id]);
  }
  async addDiagnosis(encounterId: string, data: any) {
    return this.db.query(
      `INSERT INTO diagnoses (encounter_id, diagnosis_code, diagnosis_name, diagnosis_type, notes)`
      ` VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [encounterId, data.code, data.name, data.type, data.notes]
    );
  }
  async createPrescription(encounterId: string, data: any) {
    const prescriptionId = `RX${Date.now()}`;
    return this.db.query(
      `INSERT INTO prescriptions (prescription_id, encounter_id, patient_id, doctor_id, medications)`
      ` VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [prescriptionId, encounterId, data.patientId, data.doctorId, JSON.stringify(data.medications)]
    );
  }
  async getPatientMedicalHistory(patientId: string) {
    const encounters = await this.db.queryMany("SELECT * FROM clinical_encounters WHERE patient_id = $1 ORDER BY encounter_date DESC", [patientId]);
    const diagnoses = await this.db.queryMany("SELECT * FROM diagnoses WHERE encounter_id IN (SELECT id FROM clinical_encounters WHERE patient_id = $1)", [patientId]);
    const prescriptions = await this.db.queryMany("SELECT * FROM prescriptions WHERE patient_id = $1 ORDER BY created_at DESC", [patientId]);
    return { encounters, diagnoses, prescriptions };
  }
  async addVitals(patientId: string, vitals: VitalSigns) {
    return this.db.query(
      `INSERT INTO vitals (patient_id, bp_systolic, bp_diastolic, heart_rate, temperature, respiratory_rate, oxygen_saturation, weight, height)`
      ` VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [patientId, vitals.bloodPressureSystolic, vitals.bloodPressureDiastolic, vitals.heartRate, vitals.temperature, vitals.respiratoryRate, vitals.oxygenSaturation, vitals.weight, vitals.height]
    );
  }
}
