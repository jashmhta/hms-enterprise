import { DatabaseService } from "./database.service";
export class AppointmentService {
  private db: DatabaseService;
  constructor() { this.db = new DatabaseService(); }
  async createAppointment(data: any) {
    const appointmentId = `APT${Date.now()}`;
    return this.db.query(
      `INSERT INTO appointments (appointment_id, patient_id, doctor_id, appointment_date, status)`
      ` VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [appointmentId, data.patientId, data.doctorId, data.appointmentDate, "scheduled"]
    );
  }
  async getAppointmentById(id: string) {
    return this.db.queryOne("SELECT * FROM appointments WHERE id = $1", [id]);
  }
  async getAppointmentsByPatient(patientId: string) {
    return this.db.query("SELECT * FROM appointments WHERE patient_id = $1 ORDER BY appointment_date", [patientId]);
  }
  async updateAppointment(id: string, data: any) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(", ");
    return this.db.query(`UPDATE appointments SET ${setClause} WHERE id = $1 RETURNING *`, [id, ...values]);
  }
  async cancelAppointment(id: string, reason: string) {
    return this.db.query("UPDATE appointments SET status = $2, cancellation_reason = $3 WHERE id = $1 RETURNING *", [id, "cancelled", reason]);
  }
}
