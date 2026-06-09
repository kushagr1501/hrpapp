import { RiskSeverity } from "@prisma/client";
import { z } from "zod";
import type {
  AssessmentContext,
  CompoundRuleDefinition,
  RiskAssessmentResult,
  RiskRuleDefinition,
  RiskRuleRecord,
  RuleCondition,
  TriggeredRule
} from "./risk-engine.types.js";

const severityOrder: Record<RiskSeverity, number> = {
  [RiskSeverity.none]: 0,
  [RiskSeverity.moderate]: 1,
  [RiskSeverity.high]: 2,
  [RiskSeverity.critical]: 3
};

const ruleConditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["lt", "gt", "lte", "gte", "eq", "neq", "in"]),
  value: z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))])
});

const singleRuleSchema = ruleConditionSchema.extend({
  source: z.enum(["vitals", "obstetric_history", "comorbidities"])
});

const compoundRuleSchema = z.object({
  source: z.enum(["vitals", "obstetric_history", "comorbidities"]),
  conditions: z.array(ruleConditionSchema).min(1),
  logic: z.enum(["AND", "OR"])
});

const riskRuleDefinitionSchema = z.union([singleRuleSchema, compoundRuleSchema]);

function isCompoundRule(definition: RiskRuleDefinition): definition is CompoundRuleDefinition {
  return "conditions" in definition;
}

function normalizeComparableValue(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof (value as { toNumber: unknown }).toNumber === "function"
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    const numeric = Number(value);
    if (!Number.isNaN(numeric) && value.trim() !== "") {
      return numeric;
    }

    const parsedDate = Date.parse(value);
    if (!Number.isNaN(parsedDate) && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return parsedDate;
    }

    return value;
  }

  return value;
}

function compareCondition(actualValue: unknown, condition: RuleCondition): boolean {
  if (actualValue === undefined || actualValue === null) {
    return false;
  }

  if (condition.operator === "in") {
    const expectedValues = Array.isArray(condition.value) ? condition.value : null;

    if (!expectedValues) {
      return false;
    }

    if (Array.isArray(actualValue)) {
      return actualValue.some((value) =>
        expectedValues.includes(value as string | number | boolean | null)
      );
    }

    return expectedValues.includes(actualValue as string | number | boolean | null);
  }

  const normalizedActual = normalizeComparableValue(actualValue);
  const normalizedExpected = normalizeComparableValue(condition.value);

  switch (condition.operator) {
    case "lt":
      return typeof normalizedActual === "number" && typeof normalizedExpected === "number"
        ? normalizedActual < normalizedExpected
        : false;
    case "gt":
      return typeof normalizedActual === "number" && typeof normalizedExpected === "number"
        ? normalizedActual > normalizedExpected
        : false;
    case "lte":
      return typeof normalizedActual === "number" && typeof normalizedExpected === "number"
        ? normalizedActual <= normalizedExpected
        : false;
    case "gte":
      return typeof normalizedActual === "number" && typeof normalizedExpected === "number"
        ? normalizedActual >= normalizedExpected
        : false;
    case "eq":
      return normalizedActual === normalizedExpected;
    case "neq":
      return normalizedActual !== normalizedExpected;
    default:
      return false;
  }
}

function getSourceRecords(context: AssessmentContext, source: RiskRuleDefinition["source"]): Record<string, unknown>[] {
  switch (source) {
    case "vitals":
      return [context.vitals as Record<string, unknown>];
    case "obstetric_history":
      return context.obstetricHistory as unknown as Record<string, unknown>[];
    case "comorbidities":
      return context.comorbidities as unknown as Record<string, unknown>[];
    default:
      return [];
  }
}

function ruleMatches(definition: RiskRuleDefinition, context: AssessmentContext) {
  const records = getSourceRecords(context, definition.source);
  if (records.length === 0) {
    return false;
  }

  return records.some((record) => {
    if (isCompoundRule(definition)) {
      const evaluations = definition.conditions.map((condition) => compareCondition(record[condition.field], condition));
      return definition.logic === "AND" ? evaluations.every(Boolean) : evaluations.some(Boolean);
    }

    return compareCondition(record[definition.field], definition);
  });
}

function maxSeverity(current: RiskSeverity, candidate: RiskSeverity) {
  return severityOrder[candidate] > severityOrder[current] ? candidate : current;
}

export const riskEngineService = {
  parseRuleDefinition(definition: unknown): RiskRuleDefinition {
    return riskRuleDefinitionSchema.parse(definition) as RiskRuleDefinition;
  },

  evaluateRules(rules: RiskRuleRecord[], context: AssessmentContext): RiskAssessmentResult {
    const orderedRules = [...rules].sort((left, right) => right.priority - left.priority);
    const triggeredRules: TriggeredRule[] = [];
    let overallSeverity: RiskSeverity = RiskSeverity.none;

    for (const rule of orderedRules) {
      const definition = this.parseRuleDefinition(rule.ruleDefinition);
      if (!ruleMatches(definition, context)) {
        continue;
      }

      triggeredRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity
      });

      overallSeverity = maxSeverity(overallSeverity, rule.severity);
    }

    return {
      overallSeverity,
      isHrp: severityOrder[overallSeverity] >= severityOrder[RiskSeverity.high],
      triggeredRules
    };
  }
};
