import "dotenv/config";

console.log("Checking Gemini API connection...");

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 15000);

try {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models",
    {
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      signal: controller.signal,
    }
  );

  console.log("HTTP status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.log(errorText.slice(0, 800));
  } else {
    const data = await response.json();
    const names = data.models
      ?.slice(0, 8)
      .map((model) => model.name)
      .join("\n");

    console.log("Connection successful.");
    console.log(names);
  }
} catch (error) {
  if (error.name === "AbortError") {
    console.error("Connection timed out after 15 seconds.");
  } else {
    console.error("Connection failed:", error.message);
  }
} finally {
  clearTimeout(timer);
}