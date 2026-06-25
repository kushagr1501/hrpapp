import type { Comorbidity, ObstetricHistory, RiskRule, Vitals } from "@prisma/client";

export type RuleOperator = "lt" | "gt" | "lte" | "gte" | "eq" | "neq" | "in";
export type RuleSource = "vitals" | "obstetric_history" | "comorbidities";
export type RuleLogic = "AND" | "OR";
export type RuleValue = string | number | boolean | null | Array<string | number | boolean | null>;

export type RuleCondition = {
  field: string;
  operator: RuleOperator;
  value: RuleValue;
};

export type SingleRuleDefinition = RuleCondition & {
  source: RuleSource;
};

export type CompoundRuleDefinition = {
  source: RuleSource;
  conditions: RuleCondition[];
  logic: RuleLogic;
};

export type RiskRuleDefinition = SingleRuleDefinition | CompoundRuleDefinition;

export type AssessmentContext = {
  vitals: Pick<
    Vitals,
    | "bpSystolic"
    | "bpDiastolic"
    | "weightKg"
    | "hemoglobin"
    | "bloodSugar"
    | "urineProtein"
    | "fundalHeight"
    | "fetalHeartRate"
    | "fetalPresentation"
    | "fetalMovement"
    | "isMultipleGestation"
    | "numberOfFetuses"
    | "usgDone"
    | "usgFindings"
    | "iugrSuspected"
    | "abdominalExamDone"
    | "abdominalExamNotes"
  >;
  obstetricHistory: Pick<
    ObstetricHistory,
    "pregnancyNumber" | "year" | "outcome" | "deliveryMode" | "complications" | "birthWeight" | "babyStatus"
  >[];
  comorbidities: Pick<Comorbidity, "condition" | "diagnosedDate" | "isActive" | "notes">[];
};

export type TriggeredRule = {
  ruleId: string;
  ruleName: string;
  category: string;
  isHrp: boolean;
};

export type RiskAssessmentResult = {
  isHrp: boolean;
  triggeredRules: TriggeredRule[];
};

export type RiskRuleRecord = Pick<RiskRule, "id" | "name" | "category" | "isHrp" | "priority" | "ruleDefinition">;
