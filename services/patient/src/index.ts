import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import patientRoutes from "./routes/patient.routes";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3002;
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/api/patients", patientRoutes);
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "patient-service", version: "1.0.0" });
});
app.listen(PORT, () => {
  console.log(`Patient Service started on port ${PORT}`);
});
export default app;
