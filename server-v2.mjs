import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildAgentPromptV2 } from "./agent-instructions-v2.mjs";
import {
  getEligibleTemplates,
  getTemplateSummaries,
} from "./experiment-library.mjs";
import { validateAgentOutput } from "./output-validator.mjs";

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

const MODEL = "gemini-flash-lite-latest";

app.use(express.json({ limit: "60kb" }));
app.use(express.static(path.join(__dirname, "public")));

function extractOutputText(data) {
  if (typeof data.output_text === "string") {
    return data.output_text.trim();
  }

  return (data.steps || [])
    .flatMap((step) => step.content || [])
    .filter(
      (item) => item.type === "text" && typeof item.text === "string"
    )
    .map((item) => item.text)
    .join("\n")
    .trim();
}

function parseAgentJSON(text) {
  const cleaned = String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }

    throw new Error("The model response was not valid JSON.");
  }
}

function normalizeInput(body) {
  return {
    stage: body.stage === "confirm" ? "confirm" : "plan",

    emotion:
      typeof body.emotion === "string"
        ? body.emotion.trim().slice(0, 600)
        : "",

    materials: Array.isArray(body.materials)
      ? body.materials
          .filter((item) => typeof item === "string")
          .slice(0, 20)
      : [],

    skills:
      typeof body.skills === "string"
        ? body.skills.trim().slice(0, 600)
        : "",

    time:
      typeof body.time === "string"
        ? body.time.trim().slice(0, 200)
        : "",

    workspace:
      typeof body.workspace === "string"
        ? body.workspace.trim().slice(0, 100)
        : "",

    budget:
      typeof body.budget === "string"
        ? body.budget.trim().slice(0, 100)
        : "",

    safetyLimits:
      typeof body.safetyLimits === "string"
        ? body.safetyLimits.trim().slice(0, 600)
        : "",

    mediaPriority:
      typeof body.mediaPriority === "string"
        ? body.mediaPriority.trim().slice(0, 300)
        : "",

    additionalContext:
      typeof body.additionalContext === "string"
        ? body.additionalContext.trim().slice(0, 600)
        : "",

    confirmedPlan:
      body.stage === "confirm" && Array.isArray(body.confirmedPlan)
        ? body.confirmedPlan.slice(0, 3)
        : null,

    confirmedPlanValidated: false,
  };
}

function detectHardBoundary(studentInput) {
  const requestedContent = [
    studentInput.emotion,
    studentInput.additionalContext,
  ].join(" ");

  const explicitBoundaryPattern =
    /\b(diagnos(?:e|is|tic)|as therapy|treat my|treat their|self-harm|suicid|use an? open flame|burning wax|rapid flash|strobe)\b/i;

  return explicitBoundaryPattern.test(requestedContent);
}

async function callGemini(prompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    const apiResponse = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        model: MODEL,
        input: prompt,
        generation_config: {
          max_output_tokens: 2400,
        },
      }),
      signal: controller.signal,
    });

    const apiData = await apiResponse.json();

    if (!apiResponse.ok) {
      throw new Error(
        `Gemini API returned status ${apiResponse.status}.`
      );
    }

    const outputText = extractOutputText(apiData);

    if (!outputText) {
      throw new Error("The model returned no readable output.");
    }

    return {
      apiData,
      outputText,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function safelyEvaluate(
  apiCallResult,
  studentInput,
  eligibleTemplates
) {
  try {
    const parsed = parseAgentJSON(apiCallResult.outputText);

    return validateAgentOutput(
      parsed,
      studentInput,
      eligibleTemplates
    );
  } catch {
    return {
      valid: false,
      issues: [
        "Return one complete valid JSON object matching the required output structure.",
      ],
      result: null,
    };
  }
}

function humanReviewFallback(issues, requestCount) {
  return {
    action: "REQUEST_HUMAN_REVIEW",
    reason:
      "The generated draft did not pass the application's resource and safety validation after one repair attempt.",
    message:
      "The agent could not produce a plan that matched every confirmed constraint. Stop here and ask an instructor to review the setup.",
    questions: [],
    experiments: [],
    documentationChecklist: [],
    validationIssues: issues,
    agentMeta: {
      provider: "Gemini Interactions API",
      model: MODEL,
      status: "stopped after failed validation",
      interactionId: null,
      validationStatus: "failed after one repair",
      repairAttempted: true,
      requestCount,
    },
  };
}

async function runAgentWithValidation(
  studentInput,
  eligibleTemplates
) {
  const summaries = getTemplateSummaries(eligibleTemplates);

  const firstPrompt = buildAgentPromptV2(
    studentInput,
    summaries,
    []
  );

  const firstCall = await callGemini(firstPrompt);

  const firstEvaluation = safelyEvaluate(
    firstCall,
    studentInput,
    eligibleTemplates
  );

  if (firstEvaluation.valid) {
    return {
      ...firstEvaluation.result,
      agentMeta: {
        provider: "Gemini Interactions API",
        model: MODEL,
        status: firstCall.apiData.status || "completed",
        interactionId: firstCall.apiData.id || null,
        validationStatus: "passed on first draft",
        repairAttempted: false,
        requestCount: 1,
        eligibleTemplateCount: eligibleTemplates.length,
      },
    };
  }

  const repairPrompt = buildAgentPromptV2(
    studentInput,
    summaries,
    firstEvaluation.issues
  );

  const secondCall = await callGemini(repairPrompt);

  const secondEvaluation = safelyEvaluate(
    secondCall,
    studentInput,
    eligibleTemplates
  );

  if (secondEvaluation.valid) {
    return {
      ...secondEvaluation.result,
      agentMeta: {
        provider: "Gemini Interactions API",
        model: MODEL,
        status: secondCall.apiData.status || "completed",
        interactionId: secondCall.apiData.id || null,
        validationStatus: "passed after one repair",
        repairAttempted: true,
        requestCount: 2,
        eligibleTemplateCount: eligibleTemplates.length,
      },
    };
  }

  return humanReviewFallback(
    secondEvaluation.issues,
    2
  );
}

app.get("/api/health", (request, response) => {
  response.json({
    ok: true,
    version: "2",
    architecture:
      "One decision agent with deterministic eligibility, validation, repair, and stopping rules",
    provider: "Gemini Interactions API",
    model: MODEL,
    apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

app.post("/api/agent", async (request, response) => {
  if (!process.env.GEMINI_API_KEY) {
    return response.status(500).json({
      error: "The server API credential is not configured.",
    });
  }

  const studentInput = normalizeInput(request.body || {});
  const eligibleTemplates = getEligibleTemplates(
    studentInput.materials,
    studentInput.workspace
  );

  if (detectHardBoundary(studentInput)) {
    return response.json({
      action: "REQUEST_HUMAN_REVIEW",
      reason:
        "A deterministic safety boundary identified diagnosis, therapy, self-harm, open flame, burning wax, or rapid flashing in the request.",
      message:
        "This application cannot provide diagnosis or therapy and cannot plan prohibited activity. Stop here and consult an instructor or another appropriate professional.",
      questions: [],
      experiments: [],
      documentationChecklist: [],
      agentMeta: {
        provider: "Application safety boundary",
        model: "No model call made",
        status: "stopped before API request",
        interactionId: null,
        validationStatus: "boundary stop",
        repairAttempted: false,
        requestCount: 0,
        eligibleTemplateCount: eligibleTemplates.length,
      },
    });
  }

  if (studentInput.stage === "confirm") {
    const planEvaluation = validateAgentOutput(
      {
        action: "GENERATE_EXPERIMENTS",
        reason: "",
        message: "",
        questions: [],
        experiments: studentInput.confirmedPlan || [],
        documentationChecklist: [],
      },
      {
        ...studentInput,
        stage: "plan",
      },
      eligibleTemplates
    );

    if (!planEvaluation.valid) {
      return response.json(
        humanReviewFallback(
          planEvaluation.issues,
          0
        )
      );
    }

    studentInput.confirmedPlan =
      planEvaluation.result.experiments;
    studentInput.confirmedPlanValidated = true;
  }

  try {
    const result = await runAgentWithValidation(
      studentInput,
      eligibleTemplates
    );

    response.json(result);
  } catch (error) {
    if (error.name === "AbortError") {
      return response.status(504).json({
        error:
          "The agent request took too long. Your input is preserved, so please try again.",
      });
    }

    console.error("Version 2 processing error:", error.message);

    response.status(502).json({
      error:
        "The agent request could not be safely completed. Your input is preserved.",
    });
  }
});

app.use((request, response) => {
  response.status(404).json({
    error: "The requested page or API route was not found.",
  });
});

app.listen(port, () => {
  console.log(
    `Emotion-to-Material Version 2 running at http://localhost:${port}`
  );
});