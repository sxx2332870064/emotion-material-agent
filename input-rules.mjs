export function getMissingEssentialFields(input = {}) {
  const missing = [];

  if (!String(input.emotion || "").trim()) {
    missing.push("emotion or concept");
  }

  if (!Array.isArray(input.materials) || input.materials.length === 0) {
    missing.push("materials and tools");
  }

  if (!String(input.workspace || "").trim()) {
    missing.push("workspace");
  }

  if (!String(input.safetyLimits || "").trim()) {
    missing.push("safety or access limits");
  }

  return missing;
}