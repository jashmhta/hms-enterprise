export interface Patient extends BaseModel {
  patientId: string;
  abdmHealthId?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'M' | 'F' | 'O';
  bloodGroup?: string;
  phoneNumber: string;
  email?: string;
  emergencyContact: EmergencyContact;
  addresses: Address[];
  medicalRecords: MedicalRecord[];
  allergies: Allergy[];
  chronicConditions: ChronicCondition[];
  medications: Medication[];
  insurance?: InsuranceInfo;
  vitals: VitalSigns[];
  appointments: Appointment[];
}
