import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is missing from environment variables." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { systemPrompt, message } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message prompt is required." },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Ordered list: try cheapest/fastest first, escalate if quota or overload hit
    const modelNames = [
      "gemini-2.0-flash-lite",  // lowest quota usage, try first
      "gemini-2.0-flash",       // standard stable model
      "gemini-2.5-flash",       // most capable, separate quota bucket
    ];

    // Combine system prompt and user message
    const fullPrompt = systemPrompt
      ? `System Context: ${systemPrompt}\n\nUser Message: ${message}`
      : message;

    let responseText = "";
    let lastError: any = null;

    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(fullPrompt);
        responseText = result.response.text();
        lastError = null;
        break; // Success — stop trying further fallbacks
      } catch (err: any) {
        lastError = err;
        const isRetryable = err.message?.includes("503") || err.message?.includes("429");
        if (!isRetryable) throw err; // Hard error (auth, bad request) — don't retry
        console.warn(`Model ${modelName} quota/overload hit, trying next fallback...`);
      }
    }

    if (lastError) {
      return NextResponse.json(
        { error: "All AI models are currently quota-limited or unavailable. Please try again in a minute." },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true, text: responseText });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to communicate with AI." },
      { status: 500 }
    );
  }
}
