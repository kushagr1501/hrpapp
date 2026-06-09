import { RiskSeverity } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { defaultRiskRules } from "../src/modules/risk-engine/default-risk-rules.js";
import { riskEngineService } from "../src/modules/risk-engine/risk-engine.service.js";
import type { AssessmentContext, RiskRuleRecord } from "../src/modules/risk-engine/risk-engine.types.js";

function buildRules(): RiskRuleRecord[] {
  return defaultRiskRules.map((rule, index) => ({
    id: `rule-${index + 1}`,
    name: rule.name,
    category: rule.category,
    severity: rule.severity,
    priority: rule.priority,
    ruleDefinition: rule.ruleDefinition
  }));
}

function createContext(overrides?: Partial<AssessmentContext>): AssessmentContext {
  return {
    vitals: {
      bpSystolic: 120,
      bpDiastolic: 80,
      weightKg: 62 as never,
      hemoglobin: 12 as never,
      bloodSugar: 90 as never,
      urineProtein: "nil",
      fundalHeight: 28 as never,
      fetalHeartRate: 140,
      fetalPresentation: "cephalic",
      fetalMovement: "normal",
      isMultipleGestation: false,
      numberOfFetuses: 1,
      usgDone: false,
      usgFindings: null as never,
      iugrSuspected: false,
      abdominalExamDone: false,
      abdominalExamNotes: null as never
    },
    obstetricHistory: [],
    comorbidities: [],
    ...overrides
  };
}

function expectTriggered(resultName: string, context: AssessmentContext, expectedSeverity: RiskSeverity) {
  const result = riskEngineService.evaluateRules(buildRules(), context);
  const matchedRule = result.triggeredRules.find((rule) => rule.ruleName === resultName);

  expect(matchedRule, `${resultName} should trigger`).toBeDefined();
  expect(matchedRule?.severity).toBe(expectedSeverity);
  return result;
}

describe("risk engine", () => {
  it("returns a clean assessment when no rules match", () => {
    const result = riskEngineService.evaluateRules(buildRules(), createContext());

    expect(result.isHrp).toBe(false);
    expect(result.overallSeverity).toBe(RiskSeverity.none);
    expect(result.triggeredRules).toHaveLength(0);
  });

  it("fires Severe Anemia", () => {
    expectTriggered("Severe Anemia", createContext({ vitals: { ...createContext().vitals, hemoglobin: 6.8 as never } }), RiskSeverity.critical);
  });

  it("fires Hypertension - Severe", () => {
    expectTriggered(
      "Hypertension - Severe",
      createContext({ vitals: { ...createContext().vitals, bpSystolic: 165, bpDiastolic: 92 } }),
      RiskSeverity.critical
    );
  });

  it("fires Pre-eclampsia Suspect", () => {
    expectTriggered(
      "Pre-eclampsia Suspect",
      createContext({ vitals: { ...createContext().vitals, bpSystolic: 142, urineProtein: "+2" } }),
      RiskSeverity.critical
    );
  });

  it("fires Previous C-Section", () => {
    expectTriggered(
      "Previous C-Section",
      createContext({ obstetricHistory: [{ deliveryMode: "c_section" } as never] }),
      RiskSeverity.high
    );
  });

  it("fires obstetric-history rules even when no vitals have been recorded yet", () => {
    const result = riskEngineService.evaluateRules(
      buildRules(),
      createContext({
        vitals: {} as never,
        obstetricHistory: [{ deliveryMode: "c_section" } as never]
      })
    );

    expect(result.isHrp).toBe(true);
    expect(result.overallSeverity).toBe(RiskSeverity.high);
    expect(result.triggeredRules.map((rule) => rule.ruleName)).toContain("Previous C-Section");
  });

  it("fires Previous Stillbirth", () => {
    expectTriggered(
      "Previous Stillbirth",
      createContext({ obstetricHistory: [{ outcome: "stillbirth" } as never] }),
      RiskSeverity.high
    );
  });

  it("fires Previous Obstructed Labor", () => {
    expectTriggered(
      "Previous Obstructed Labor",
      createContext({ obstetricHistory: [{ complications: "obstructed_labor" } as never] }),
      RiskSeverity.high
    );
  });

  it("fires Previous PPH", () => {
    expectTriggered(
      "Previous PPH",
      createContext({ obstetricHistory: [{ complications: "pph" } as never] }),
      RiskSeverity.high
    );
  });

  it("fires Previous Eclampsia", () => {
    expectTriggered(
      "Previous Eclampsia",
      createContext({ obstetricHistory: [{ complications: "eclampsia" } as never] }),
      RiskSeverity.critical
    );
  });

  it("fires Gestational Diabetes", () => {
    expectTriggered(
      "Gestational Diabetes",
      createContext({ comorbidities: [{ condition: "diabetes", isActive: true } as never] }),
      RiskSeverity.high
    );
  });

  it("fires HIV Positive", () => {
    expectTriggered(
      "HIV Positive",
      createContext({ comorbidities: [{ condition: "hiv", isActive: true } as never] }),
      RiskSeverity.high
    );
  });

  it("fires Tuberculosis", () => {
    expectTriggered(
      "Tuberculosis",
      createContext({ comorbidities: [{ condition: "tb", isActive: true } as never] }),
      RiskSeverity.high
    );
  });

  it("fires Heart Disease", () => {
    expectTriggered(
      "Heart Disease",
      createContext({ comorbidities: [{ condition: "heart_disease", isActive: true } as never] }),
      RiskSeverity.critical
    );
  });

  it("fires Multiple Gestation (Twins+)", () => {
    expectTriggered(
      "Multiple Gestation (Twins+)",
      createContext({ vitals: { ...createContext().vitals, isMultipleGestation: true, numberOfFetuses: 2 } }),
      RiskSeverity.high
    );
  });

  it("fires IUGR Suspected", () => {
    expectTriggered(
      "IUGR Suspected",
      createContext({ vitals: { ...createContext().vitals, iugrSuspected: true } }),
      RiskSeverity.high
    );
  });

  it("fires Malpresentation (Breech/Transverse)", () => {
    expectTriggered(
      "Malpresentation (Breech/Transverse)",
      createContext({ vitals: { ...createContext().vitals, fetalPresentation: "breech" } }),
      RiskSeverity.high
    );
  });

  it("fires Reduced Fetal Movement", () => {
    expectTriggered(
      "Reduced Fetal Movement",
      createContext({ vitals: { ...createContext().vitals, fetalMovement: "reduced" } }),
      RiskSeverity.critical
    );
  });

  it("keeps the highest severity when multiple rules trigger", () => {
    const result = riskEngineService.evaluateRules(
      buildRules(),
      createContext({
        vitals: {
          ...createContext().vitals,
          hemoglobin: 6.5 as never,
          fetalMovement: "reduced",
          isMultipleGestation: true,
          numberOfFetuses: 2
        },
        comorbidities: [{ condition: "diabetes", isActive: true } as never]
      })
    );

    expect(result.isHrp).toBe(true);
    expect(result.overallSeverity).toBe(RiskSeverity.critical);
    expect(result.triggeredRules.map((rule) => rule.ruleName)).toEqual(
      expect.arrayContaining([
        "Severe Anemia",
        "Reduced Fetal Movement",
        "Multiple Gestation (Twins+)",
        "Gestational Diabetes"
      ])
    );
  });
});
