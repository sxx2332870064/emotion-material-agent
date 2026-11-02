import "dotenv/config";

console.log("Starting Gemini Interactions REST test...");

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 60000);

try {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/interactions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        model: "gemini-flash-lite-latest",
        input: "Reply with exactly: API connection successful",
        generation_config: {
          max_output_tokens: 50,
        },
      }),
      signal: controller.signal,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("API test failed:", JSON.stringify(data, null, 2));
    process.exit(1);
  }

  const output =
    data.output_text ||
    data.steps
      ?.flatMap((step) => step.content || [])
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n");

  console.log("Status:", data.status);
  console.log("Output:", output || "No text output returned.");
} catch (error) {
  if (error.name === "AbortError") {
    console.error("API test failed: request timed out after 60 seconds.");
  } else {
    console.error("API test failed:", error.message);
  }
} finally {
  clearTimeout(timer);
}