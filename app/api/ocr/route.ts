import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key is missing." }, { status: 500 });
    }

    const { base64Image, expectedRegNo, expectedName } = await req.json();

    if (!base64Image || !expectedRegNo || !expectedName) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // best for vision right now

    let cleanBase64 = base64Image;
    let mimeType = "image/jpeg";

    if (base64Image.startsWith("http")) {
      const resp = await fetch(base64Image);
      const arrayBuffer = await resp.arrayBuffer();
      cleanBase64 = Buffer.from(arrayBuffer).toString("base64");
      mimeType = resp.headers.get("content-type") || "image/jpeg";
    } else {
       cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
    }

    const prompt = `
      You are an expert document verification AI. Look at the provided image which claims to be an NGO registration certificate.
      Extract the text and strictly verify two things:
      1. Does the NGO Name exactly or closely match: "${expectedName}"?
      2. Does the Registration Number exactly match: "${expectedRegNo}"?
      
      Respond STRICTLY in this JSON format:
      {
        "isVerified": boolean,
        "confidence": "high" | "medium" | "low",
        "extractedName": "string or null",
        "extractedRegNo": "string or null",
        "reason": "short explanation of why it was verified or rejected"
      }
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType, // fallback, Gemini usually auto-detects from the base64 payload anyway if standard
        },
      },
    ]);

    const resText = result.response.text();
    
    // Attempt to parse JSON from the markdown block or direct text
    const jsonMatch = resText.match(/```json\n([\s\S]*?)\n```/) || resText;
    const jsonString = Array.isArray(jsonMatch) ? jsonMatch[1] : resText;
    
    const parsed = JSON.parse(jsonString);

    return NextResponse.json({ success: true, verification: parsed });

  } catch (error: any) {
    console.error("OCR API Error:", error);
    return NextResponse.json(
      { error: "Failed to process image through AI OCR." },
      { status: 500 }
    );
  }
}
