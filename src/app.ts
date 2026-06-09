import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { alertsRouter } from "./modules/alerts/alerts.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { birthPlanRouter } from "./modules/birth-plan/birth-plan.routes.js";
import { comorbiditiesRouter } from "./modules/comorbidities/comorbidities.routes.js";
import { obstetricHistoryRouter } from "./modules/obstetric-history/obstetric-history.routes.js";
import { patientRouter } from "./modules/patient/patient.routes.js";
import { patientSelfRouter } from "./modules/patient-self/patient-self.routes.js";
import { referralsRouter } from "./modules/referrals/referrals.routes.js";
import { reportsRouter } from "./modules/reports/reports.routes.js";
import { visitRouter } from "./modules/visit/visit.routes.js";
import { vitalsRouter } from "./modules/vitals/vitals.routes.js";

import rateLimit from "express-rate-limit";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.ALLOWED_ORIGIN === "*" ? (origin, callback) => callback(null, true) : env.ALLOWED_ORIGIN,
      credentials: true
    })
  );
  app.use(helmet());
  app.use(express.json());

  // General API Rate Limiter
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window`
    message: "Too many requests from this IP, please try again after 15 minutes",
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Strict Auth Rate Limiter
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 login/register requests per window
    message: "Too many authentication attempts, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use("/api/", apiLimiter);
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);

  app.get("/health", (_request, response) => {
    response.json({
      success: true,
      data: {
        status: "ok",
        service: "hrp-server"
      }
    });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/patient", patientSelfRouter);
  app.use("/api/patients", patientRouter);
  app.use("/api", alertsRouter);
  app.use("/api", birthPlanRouter);
  app.use("/api", comorbiditiesRouter);
  app.use("/api", obstetricHistoryRouter);
  app.use("/api", referralsRouter);
  app.use("/api", reportsRouter);
  app.use("/api", visitRouter);
  app.use("/api", vitalsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
