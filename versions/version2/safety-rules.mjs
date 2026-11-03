export function detectExplicitBoundary(input = {}) {
  const rawText = [
    input.emotion,
    ...(input.materials || []),
    input.skills,
    input.time,
    input.workspace,
    input.budget,
    input.safetyLimits,
    input.mediaPriority,
    input.additionalContext,
  ]
    .filter(Boolean)
    .join(" ");

  const negatedSafetyStatement =
    /\b(?:no|not|cannot|can't|do not|don't|without|prohibited|not allowed|not permitted|does not permit)\b[^.!?;\n]{0,60}\b(?:diagnos(?:e|is|tic)|therapy|open flame|flame|fire|burning wax|rapid(?:ly)? flashing|strobe)\b/gi;

  const scanText = rawText.replace(
    negatedSafetyStatement,
    " "
  );

  const explicitPatterns = [
    /\bdiagnos(?:e|es|ed|ing|is|tic)\b/i,
    /\b(?:as|for)\s+therapy\b|\btherapy\s+(?:for|to treat)\b/i,
    /\bself[- ]harm\b|\bsuicid\w*\b/i,
    /\b(?:use|light|ignite|start)\b[^.!?;\n]{0,40}\b(?:open flame|flame|fire)\b/i,
    /\bset\b[^.!?;\n]{0,25}\bwax\b[^.!?;\n]{0,15}\bon fire\b/i,
    /\bburn(?:ing)?\b[^.!?;\n]{0,20}\bwax\b|\bwax\b[^.!?;\n]{0,20}\bburn(?:ing)?\b/i,
    /\brapid(?:ly)?\s+flash(?:ing)?\b|\bstrobe\b/i,
  ];

  return explicitPatterns.some((pattern) =>
    pattern.test(scanText)
  );
}