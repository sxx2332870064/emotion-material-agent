import {
  materialKeyByLabel,
  experimentTemplates,
} from "./experiment-library.mjs";

const allowedActions = new Set([
  "ASK_CLARIFICATION",
  "GENERATE_EXPERIMENTS",
  "REQUEST_HUMAN_REVIEW",
  "COMPLETE",
]);

const unconfirmedToolPattern =
  /\b(needle|needles|tape|frame|mount|mounts|bracket|hook|hooks|camera|phone|ruler|measuring tape|dropper|brush|tripod|battery|power supply|wiring|wire)\b/i;

const exactMeasurementPattern =
  /\b\d+(?:\.\d+)?\s*(?:cm|mm|inches?|inch|feet|ft|hz|db|degrees?)\b/i;

const unsafeMethodPattern =
  /\b(open flame|burning wax|rapid flashing|strobe|toxic material|high-volume sound|high-pitched sound)\b/i;

const wallAttachmentPattern =
  /\b(mount|attach|tape|stick|fasten|pin|nail)\b[^.]{0,35}\bwall\b|\bwall\b[^.]{0,35}\b(mount|attach|tape|stick|fasten|pin|nail)\b/i;

const leadingEmotionPattern =
  /\b(protective|restrictive|restriction|openness|revealing|concealing|inviting|pushing away|isolation|closeness versus distance|close or distant)\b/i;

const documentationToolPattern =
  /\b(photograph|photography|camera|phone|video|screenshot|ruler|measure|measuring)\b/i;

function stripStepNumber(step) {
  return String(step || "")
    .replace(/^\s*\d+\s*\\?[.)\-:]\s*/, "")
    .trim();
}

function normalizeArrays(result) {
  result.questions = Array.isArray(result.questions) ? result.questions : [];
  result.experiments = Array.isArray(result.experiments)
    ? result.experiments
    : [];
  result.documentationChecklist = Array.isArray(
    result.documentationChecklist
  )
    ? result.documentationChecklist
    : [];

  result.experiments = result.experiments.map((experiment) => ({
    ...experiment,
    trials: Array.isArray(experiment.trials) ? experiment.trials : [],
    constants: Array.isArray(experiment.constants)
      ? experiment.constants
      : [],
    materials: Array.isArray(experiment.materials)
      ? experiment.materials
      : [],
    steps: Array.isArray(experiment.steps)
      ? experiment.steps.map(stripStepNumber)
      : [],
  }));

  return result;
}

function experimentActionText(experiment) {
  return [
    experiment.title,
    experiment.primaryVariable,
    ...(experiment.trials || []),
    ...(experiment.materials || []),
    ...(experiment.steps || []),
  ]
    .filter(Boolean)
    .join(" ");
}

function sameArray(first, second) {
  return JSON.stringify(first) === JSON.stringify(second);
}

export function validateAgentOutput(
  rawResult,
  studentInput,
  eligibleTemplates
) {
  const result = normalizeArrays(structuredClone(rawResult || {}));
  const issues = [];

  if (!allowedActions.has(result.action)) {
    issues.push("Return one supported agent action.");
    return { valid: false, issues, result };
  }

  const eligibleMap = new Map(
    eligibleTemplates.map((template) => [template.id, template])
  );

  const selectedMaterialLabels = new Set(studentInput.materials || []);

  if (result.action === "ASK_CLARIFICATION") {
    if (eligibleTemplates.length >= 3) {
      issues.push(
        "Do not ask unnecessary questions because at least three compatible templates are already available."
      );
    }

    if (result.questions.length < 1 || result.questions.length > 3) {
      issues.push("Ask between one and three clarification questions.");
    }

    const studentFacingText = [
      result.message,
      ...result.questions,
    ].join(" ");

    for (const templateId of Object.keys(experimentTemplates)) {
      if (studentFacingText.includes(templateId)) {
        issues.push(
          "Do not expose internal template identifiers to the student."
        );
        break;
      }
    }
  }

  if (result.action === "GENERATE_EXPERIMENTS") {
    if (result.experiments.length !== 3) {
      issues.push("Generate exactly three experiments.");
    }

    const usedIds = new Set();

    result.experiments.forEach((experiment, index) => {
      const label = `Experiment ${index + 1}`;

      if (!eligibleMap.has(experiment.templateId)) {
        issues.push(
          `${label} uses a template that was not confirmed as eligible.`
        );
        return;
      }

      if (usedIds.has(experiment.templateId)) {
        issues.push(`${label} repeats a template ID.`);
      }

      usedIds.add(experiment.templateId);

      const template = eligibleMap.get(experiment.templateId);

      if (experiment.primaryVariable !== template.variable) {
        issues.push(
          `${label} must preserve the approved primary variable.`
        );
      }

      if (!sameArray(experiment.trials, template.trials)) {
        issues.push(
          `${label} must preserve the three approved neutral trials.`
        );
      }

      if (
        experiment.steps.length < 3 ||
        experiment.steps.length > 5
      ) {
        issues.push(`${label} must contain three to five steps.`);
      }

      if (experiment.trials.length !== 3) {
        issues.push(`${label} must contain exactly three trials.`);
      }

      if (experiment.constants.length < 2) {
        issues.push(
          `${label} should state at least two conditions kept constant.`
        );
      }

      for (const material of experiment.materials) {
        if (!selectedMaterialLabels.has(material)) {
          issues.push(
            `${label} introduces an unconfirmed material or tool: ${material}.`
          );
        }
      }

      const experimentMaterialKeys = new Set(
        experiment.materials
          .map((labelText) => materialKeyByLabel[labelText])
          .filter(Boolean)
      );

      for (const requirement of template.requires) {
        if (!experimentMaterialKeys.has(requirement)) {
          issues.push(
            `${label} is missing a confirmed resource required by its selected template.`
          );
        }
      }

      const actionText = experimentActionText(experiment);

      if (unconfirmedToolPattern.test(actionText)) {
        issues.push(
          `${label} introduces an unconfirmed tool, support, or attachment method.`
        );
      }

      if (exactMeasurementPattern.test(actionText)) {
        issues.push(
          `${label} uses an exact measurement without a confirmed measuring tool.`
        );
      }

      if (unsafeMethodPattern.test(actionText)) {
        issues.push(`${label} contains a prohibited method.`);
      }

      if (wallAttachmentPattern.test(actionText)) {
        issues.push(
          `${label} instructs the student to attach material to the wall.`
        );
      }

      if (
        leadingEmotionPattern.test(
          String(experiment.emotionalQuestion || "")
        )
      ) {
        issues.push(
          `${label} uses a leading emotional question instead of keeping interpretation open.`
        );
      }

      if (!String(experiment.observableEvidence || "").trim()) {
        issues.push(
          `${label} must identify neutral observable evidence.`
        );
      }

      if (!String(experiment.constraintCheck || "").trim()) {
        issues.push(`${label} must include a constraint check.`);
      }
    });
  }

  if (result.action === "COMPLETE") {
    if (
      studentInput.stage !== "confirm" ||
      studentInput.confirmedPlanValidated !== true
    ) {
      issues.push(
        "Use COMPLETE only after the application confirms that the plan passed validation."
      );
    }

    const completionText = [
      result.message,
      result.reason,
      ...result.documentationChecklist,
    ].join(" ");

    if (
      /\b(completed tests|completed experiments|finished tests|finished experiments)\b/i.test(
        completionText
      )
    ) {
      issues.push(
        "Do not claim that physical experiments were completed; only the planning process is complete."
      );
    }

    if (documentationToolPattern.test(completionText)) {
      issues.push(
        "Use written laptop notes only; do not introduce unconfirmed documentation or measuring tools."
      );
    }

    if (result.documentationChecklist.length < 2) {
      issues.push(
        "Provide at least two concise written documentation items."
      );
    }
  }

  if (
    result.action !== "GENERATE_EXPERIMENTS" &&
    result.experiments.length > 0
  ) {
    issues.push(
      "Only GENERATE_EXPERIMENTS may return experiment objects."
    );
  }

  return {
    valid: issues.length === 0,
    issues,
    result,
  };
}