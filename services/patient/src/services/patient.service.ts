import { DatabaseService } from "./database.service";
import { Patient } from "./types";
export class PatientService {
  private db: DatabaseService;
  constructor() { this.db = new DatabaseService(); }
  async createPatient(patientData: Partial<Patient>) {
    const patientId = `PAT${Date.now()}`;
    return this.db.query(
      `INSERT INTO patients (patient_id, first_name, last_name, date_of_birth, gender, phone_number, email)`
      ` VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [patientId, patientData.firstName, patientData.lastName, patientData.dateOfBirth,
       patientData.gender, patientData.phoneNumber, patientData.email]
    );
  }
  async getPatientById(id: string) {
    return this.db.queryOne("SELECT * FROM patients WHERE id = $1", [id]);
  }
  async linkABDMHealthId(patientId: string, healthId: string) {
    return this.db.query(
      "UPDATE patients SET abdm_health_id = $2 WHERE id = $1 RETURNING *",
      [patientId, healthId]
    );
  }
}
