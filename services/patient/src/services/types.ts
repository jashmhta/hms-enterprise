export interface BaseModel {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface Patient extends BaseModel {
  patientId: string;
  abdmHealthId?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: "M" | "F" | "O";
  bloodGroup?: string;
  phoneNumber: string;
  email?: string;
}
