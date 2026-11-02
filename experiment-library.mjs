export const materialKeyByLabel = Object.freeze({
  "Laptop with basic p5.js": "p5",
  "Projector": "projector",
  "Tracing paper": "paper",
  "Thread": "thread",
  "Room-temperature modeling wax": "wax",
  "Ink": "ink",
  "Speakers": "speakers",
  "Small LEDs without confirmed power setup": "leds",
});

export const experimentTemplates = Object.freeze({
  paperDistance: {
    id: "paperDistance",
    title: "Projection Distance and Paper Presence",
    requires: ["p5", "projector", "paper"],
    workspaces: ["Tabletop + wall", "Wall area only"],
    variable: "Position of one tracing-paper sheet in the projection path",
    trials: [
      "Held close to the wall",
      "Held around one hand-width from the wall",
      "Held around three hand-widths from the wall",
    ],
    safeMethod:
      "The paper is held by hand without tape, mounts, wall attachment, or contact with the projector.",
  },

  threadDensity: {
    id: "threadDensity",
    title: "Thread Density and Digital Boundary",
    requires: ["p5", "projector", "thread"],
    workspaces: ["Tabletop + wall", "Tabletop only"],
    variable: "Density of a freestanding thread barrier",
    trials: [
      "One thread",
      "A loose thread bundle",
      "A compact thread knot",
    ],
    safeMethod:
      "Thread rests freely on the tabletop and is not stitched, suspended, mounted, or attached to equipment.",
  },

  waxDepth: {
    id: "waxDepth",
    title: "Wax Depth and Projected Integrity",
    requires: ["p5", "projector", "wax"],
    workspaces: ["Tabletop + wall", "Tabletop only"],
    variable: "Depth of a freestanding wax form",
    trials: [
      "A thin self-supporting form",
      "A medium self-supporting form",
      "A thick self-supporting form",
    ],
    safeMethod:
      "Room-temperature wax remains freestanding on the tabletop and does not touch electronics or the wall.",
  },

  dryInk: {
    id: "dryInk",
    title: "Dry Ink Density and Digital Legibility",
    requires: ["p5", "projector", "paper", "ink"],
    workspaces: [
      "Tabletop + wall",
      "Tabletop only",
      "Wall area only",
    ],
    variable: "Density of a fully dried ink trace",
    trials: [
      "No ink",
      "A light dry trace",
      "A layered dry trace",
    ],
    safeMethod:
      "Ink is applied away from electronics and fully dried before the sample enters the projection area.",
  },

  threadTension: {
    id: "threadTension",
    title: "Thread Tension and Projected Surface Change",
    requires: ["p5", "projector", "paper", "thread"],
    workspaces: [
      "Tabletop + wall",
      "Tabletop only",
      "Wall area only",
    ],
    variable: "Thread tension against a tracing-paper surface",
    trials: [
      "Loose contact",
      "Taut contact",
      "Carefully tightened contact that creates a visible crease",
    ],
    safeMethod:
      "Thread is wrapped or pressed around an existing paper edge without needles, puncturing, tape, or mounts.",
  },

  paperLayers: {
    id: "paperLayers",
    title: "Paper Layers and Projected Visual Access",
    requires: ["p5", "projector", "paper"],
    workspaces: [
      "Tabletop + wall",
      "Tabletop only",
      "Wall area only",
    ],
    variable: "Number of tracing-paper layers in the same light path",
    trials: [
      "One layer",
      "Three layers",
      "Five layers",
    ],
    safeMethod:
      "Paper remains flat on the tabletop or is held by hand without suspension, tape, mounts, or wall attachment.",
  },

  screenPacing: {
    id: "screenPacing",
    title: "Digital Pace and Perceived Dry Ink Movement",
    requires: ["p5", "ink"],
    workspaces: ["Tabletop + wall", "Tabletop only"],
    variable: "Speed of a slow, non-flashing p5.js transition",
    trials: [
      "Static display",
      "One slow transition",
      "A moderately paced transition",
    ],
    safeMethod:
      "Only a fully dried ink sample is viewed beside the laptop, and no rapid flashing is used.",
  },

  soundContext: {
    id: "soundContext",
    title: "Digital Sound Context and Thread Perception",
    requires: ["p5", "speakers", "thread"],
    workspaces: ["Tabletop + wall", "Tabletop only"],
    variable: "Low-volume digital sound condition",
    trials: [
      "Silence",
      "A quiet steady sound",
      "A quiet slow pulse",
    ],
    safeMethod:
      "Sound remains at a comfortable volume and is used as perceptual context, not as a force to move materials.",
  },
});

export function getSelectedMaterialKeys(materialLabels = []) {
  return new Set(
    materialLabels
      .map((label) => materialKeyByLabel[label])
      .filter(Boolean)
  );
}

export function getEligibleTemplates(materialLabels, workspace) {
  const selectedKeys = getSelectedMaterialKeys(materialLabels);

  return Object.values(experimentTemplates).filter((template) => {
    const resourcesMatch = template.requires.every((requirement) =>
      selectedKeys.has(requirement)
    );

    const workspaceMatches = template.workspaces.includes(workspace);

    return resourcesMatch && workspaceMatches;
  });
}

export function getTemplateSummaries(templates) {
  return templates.map((template) => ({
    id: template.id,
    title: template.title,
    variable: template.variable,
    neutralTrials: template.trials,
    confirmedSafeMethod: template.safeMethod,
  }));
}