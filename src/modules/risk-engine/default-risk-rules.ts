import { RiskSeverity } from "@prisma/client";
import type { RiskRuleDefinition } from "./risk-engine.types.js";

export type DefaultRiskRuleSeed = {
  name: string;
  category: string;
  severity: RiskSeverity;
  priority: number;
  ruleDefinition: RiskRuleDefinition;
};

export const defaultRiskRules: DefaultRiskRuleSeed[] = [
  {
    name: "Severe Anemia",
    category: "anemia",
    severity: RiskSeverity.critical,
    priority: 100,
    ruleDefinition: { source: "vitals", field: "hemoglobin", operator: "lt", value: 7 }
  },
  {
    name: "Hypertension - Severe",
    category: "hypertension",
    severity: RiskSeverity.critical,
    priority: 95,
    ruleDefinition: {
      source: "vitals",
      conditions: [
        { field: "bpSystolic", operator: "gte", value: 160 },
        { field: "bpDiastolic", operator: "gte", value: 110 }
      ],
      logic: "OR"
    }
  },
  {
    name: "Pre-eclampsia Suspect",
    category: "hypertension",
    severity: RiskSeverity.critical,
    priority: 94,
    ruleDefinition: {
      source: "vitals",
      conditions: [
        { field: "bpSystolic", operator: "gte", value: 140 },
        { field: "urineProtein", operator: "in", value: ["+1", "+2", "+3", "+4"] }
      ],
      logic: "AND"
    }
  },
  {
    name: "Previous C-Section",
    category: "obstetric_history",
    severity: RiskSeverity.high,
    priority: 70,
    ruleDefinition: { source: "obstetric_history", field: "deliveryMode", operator: "eq", value: "c_section" }
  },
  {
    name: "Previous Stillbirth",
    category: "obstetric_history",
    severity: RiskSeverity.high,
    priority: 72,
    ruleDefinition: { source: "obstetric_history", field: "outcome", operator: "eq", value: "stillbirth" }
  },
  {
    name: "Previous Obstructed Labor",
    category: "obstetric_history",
    severity: RiskSeverity.high,
    priority: 71,
    ruleDefinition: { source: "obstetric_history", field: "complications", operator: "eq", value: "obstructed_labor" }
  },
  {
    name: "Previous PPH",
    category: "obstetric_history",
    severity: RiskSeverity.high,
    priority: 73,
    ruleDefinition: { source: "obstetric_history", field: "complications", operator: "eq", value: "pph" }
  },
  {
    name: "Previous Eclampsia",
    category: "obstetric_history",
    severity: RiskSeverity.critical,
    priority: 85,
    ruleDefinition: { source: "obstetric_history", field: "complications", operator: "eq", value: "eclampsia" }
  },
  {
    name: "Gestational Diabetes",
    category: "comorbidity",
    severity: RiskSeverity.high,
    priority: 60,
    ruleDefinition: { source: "comorbidities", field: "condition", operator: "eq", value: "diabetes" }
  },
  {
    name: "HIV Positive",
    category: "comorbidity",
    severity: RiskSeverity.high,
    priority: 61,
    ruleDefinition: { source: "comorbidities", field: "condition", operator: "eq", value: "hiv" }
  },
  {
    name: "Tuberculosis",
    category: "comorbidity",
    severity: RiskSeverity.high,
    priority: 62,
    ruleDefinition: { source: "comorbidities", field: "condition", operator: "eq", value: "tb" }
  },
  {
    name: "Heart Disease",
    category: "comorbidity",
    severity: RiskSeverity.critical,
    priority: 86,
    ruleDefinition: { source: "comorbidities", field: "condition", operator: "eq", value: "heart_disease" }
  },
  {
    name: "Multiple Gestation (Twins+)",
    category: "complication",
    severity: RiskSeverity.high,
    priority: 65,
    ruleDefinition: { source: "vitals", field: "isMultipleGestation", operator: "eq", value: true }
  },
  {
    name: "IUGR Suspected",
    category: "complication",
    severity: RiskSeverity.high,
    priority: 66,
    ruleDefinition: { source: "vitals", field: "iugrSuspected", operator: "eq", value: true }
  },
  {
    name: "Malpresentation (Breech/Transverse)",
    category: "complication",
    severity: RiskSeverity.high,
    priority: 67,
    ruleDefinition: { source: "vitals", field: "fetalPresentation", operator: "in", value: ["breech", "transverse"] }
  },
  {
    name: "Reduced Fetal Movement",
    category: "complication",
    severity: RiskSeverity.critical,
    priority: 90,
    ruleDefinition: { source: "vitals", field: "fetalMovement", operator: "in", value: ["reduced", "absent"] }
  }
];
