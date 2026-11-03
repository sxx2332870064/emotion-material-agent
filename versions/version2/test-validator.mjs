import { getEligibleTemplates } from "./experiment-library.mjs";
import { validateAgentOutput } from "./output-validator.mjs";

const studentInput = {
  stage: "plan",
  emotion:
    "I want to explore the tension of wanting emotional closeness with someone, but also needing distance.",
  materials: [
    "Laptop with basic p5.js",
    "Projector",
    "Tracing paper",
    "Thread",
    "Room-temperature modeling wax",
    "Ink",
  ],
  skills:
    "Basic p5.js, digital drawing, projection, sewing, and basic hand assembly.",
  time: "Two weeks",
  workspace: "Tabletop + wall",
  budget: "$60",
  safetyLimits:
    "No open flame, toxic materials, sharp objects, ceiling suspension, or interaction that only works in complete darkness. I cannot attach materials to electronics or the wall.",
  mediaPriority: "Digital media should be the main changing system.",
  additionalContext: "",
};

const version1StyleDraft = {
  action: "GENERATE_EXPERIMENTS",
  reason: "Draft for validator testing.",
  message: "Three experiments.",
  questions: [],
  documentationChecklist: [],

  experiments: [
    {
      templateId: "paperDistance",
      title: "Tracing Paper Distance Layers",
      researchQuestion:
        "How does distance change a projected particle field?",
      primaryVariable:
        "Distance between two tracing-paper layers",
      trials: ["0 cm", "3 cm", "6 cm"],
      constants: ["Projector position", "p5.js code"],
      materials: [
        "Laptop with basic p5.js",
        "Projector",
        "Tracing paper",
      ],
      steps: [
        "Mount the back sheet of tracing paper on the wall.",
        "Measure the second sheet at 3 cm from the wall.",
        "Repeat at 6 cm.",
      ],
      observableEvidence:
        "Record edge clarity and light diffusion.",
      technicalQuestion:
        "How does focal length change?",
      emotionalQuestion:
        "Does the distance feel like closeness or isolation?",
      constraintCheck:
        "The setup follows all constraints.",
    },

    {
      templateId: "threadDensity",
      title: "Thread Barrier",
      researchQuestion:
        "How does a stitched thread frame interrupt projection?",
      primaryVariable:
        "Spacing of thread on a stitched paper frame",
      trials: ["0.5 cm", "1.5 cm", "3 cm"],
      constants: ["Projector position", "p5.js code"],
      materials: [
        "Laptop with basic p5.js",
        "Projector",
        "Thread",
        "Paper frame",
        "Needle",
      ],
      steps: [
        "Use a needle to stitch thread across a paper frame.",
        "Mount the frame in front of the wall.",
        "Run the projection.",
      ],
      observableEvidence:
        "Record the interrupted projected lines.",
      technicalQuestion:
        "Which spacing blocks the most light?",
      emotionalQuestion:
        "Does the barrier feel restrictive or open?",
      constraintCheck:
        "The setup follows all constraints.",
    },

    {
      templateId: "dryInk",
      title: "Ink Opacity",
      researchQuestion: "",
      primaryVariable:
        "Opacity of an ink wash",
      trials: [
        "Transparent wash",
        "Medium wash",
        "Opaque wash",
      ],
      constants: ["Projector position", "p5.js code"],
      materials: [
        "Laptop with basic p5.js",
        "Projector",
        "Tracing paper",
        "Ink",
      ],
      steps: [
        "Apply ink away from electronics.",
        "Let the samples dry.",
        "Place each dry sample in the projection.",
      ],
      observableEvidence:
      "This proves the material represents emotional isolation.",
      technicalQuestion: "",
      emotionalQuestion: "",
      constraintCheck:
      "This experiment is safe.",
    },
  ],
};

const eligibleTemplates = getEligibleTemplates(
  studentInput.materials,
  studentInput.workspace
);

const validation = validateAgentOutput(
  version1StyleDraft,
  studentInput,
  eligibleTemplates
);

console.log("Version 1 style draft valid:", validation.valid);
console.log("Issues detected:", validation.issues.length);

validation.issues.forEach((issue, index) => {
  console.log(`${index + 1}. ${issue}`);
});