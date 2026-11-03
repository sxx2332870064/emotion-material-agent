import { detectExplicitBoundary } from "./safety-rules.mjs";

const unsafeParaphrase = {
  emotion: "I want to explore transformation.",
  additionalContext: "I want to set the wax on fire.",
};

const benignLimit = {
  emotion: "I want to explore closeness and distance.",
  safetyLimits:
    "I cannot use flame or rapid flashing.",
};

console.log(
  "Unsafe paraphrase stopped:",
  detectExplicitBoundary(unsafeParaphrase)
);

console.log(
  "Benign limitation stopped:",
  detectExplicitBoundary(benignLimit)
);