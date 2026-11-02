import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAgentPrompt } from "./agent-instructions-v1.mjs";

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

const MODEL = "gemini-flash-lite-latest";

app.use(express.json({ limit: "50kb" }));
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
  const cleaned = text
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
      body.stage === "confirm" && body.confirmedPlan
        ? body.confirmedPlan
        : null,
  };
}

function validateAgentResult(result) {
  const allowedActions = [
    "ASK_CLARIFICATION",
    "GENERATE_EXPERIMENTS",
    "REQUEST_HUMAN_REVIEW",
    "COMPLETE",
  ];

  if (!result || typeof result !== "object") {
    throw new Error("Agent result is missing.");
  }

  if (!allowedActions.includes(result.action)) {
    throw new Error("Agent returned an unsupported action.");
  }

  result.questions = Array.isArray(result.questions) ? result.questions : [];
  result.experiments = Array.isArray(result.experiments)
    ? result.experiments
    : [];
  result.documentationChecklist = Array.isArray(
    result.documentationChecklist
  )
    ? result.documentationChecklist
    : [];

  return result;
}

app.get("/api/health", (request, response) => {
  response.json({
    ok: true,
    version: "1",
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
  const agentPrompt = buildAgentPrompt(studentInput);

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
        input: agentPrompt,
        generation_config: {
          max_output_tokens: 2400,
        },
      }),
      signal: controller.signal,
    });

    const apiData = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error("Gemini API error status:", apiResponse.status);

      return response.status(502).json({
        error:
          "The educational agent could not complete the request. Please try again.",
      });
    }

    const outputText = extractOutputText(apiData);

    if (!outputText) {
      throw new Error("The model returned no readable output.");
    }

    const agentResult = validateAgentResult(parseAgentJSON(outputText));

    response.json({
      ...agentResult,
      agentMeta: {
        provider: "Gemini Interactions API",
        model: MODEL,
        status: apiData.status || "completed",
        interactionId: apiData.id || null,
      },
    });
  } catch (error) {
    if (error.name === "AbortError") {
      return response.status(504).json({
        error:
          "The agent request took too long. Your input is still preserved, so please try again.",
      });
    }

    console.error("Agent processing error:", error.message);

    response.status(502).json({
      error:
        "The agent response could not be safely processed. Your input is still preserved.",
    });
  } finally {
    clearTimeout(timeout);
  }
});

app.use((request, response) => {
  response.status(404).json({
    error: "The requested page or API route was not found.",
  });
});

app.listen(port, () => {
  console.log(
    `Emotion-to-Material Version 1 running at http://localhost:${port}`
  );
});