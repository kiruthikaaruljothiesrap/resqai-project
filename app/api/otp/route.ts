import twilio from "twilio";
import { NextResponse } from "next/server";

// In-memory OTP store (works perfectly for single-server / hackathon deployments)
// For production multi-server, replace with Redis or Firebase Admin SDK
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

export async function POST(req: Request) {
  try {
    const { action, phone, otp } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }

    const normalizedPhone = phone.toString().replace(/\s+/g, "").replace(/^00/, "+");

    // ── SEND OTP ────────────────────────────────────────────────────────────
    if (action === "send") {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      otpStore.set(normalizedPhone, { otp: generatedOtp, expiresAt });

      // Integrate Twilio for Production SMS Validation
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await client.messages.create({
          body: `Your ResQAI verification code is: ${generatedOtp}. It expires in 10 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: normalizedPhone
        });
        console.log(`[Twilio SMS] Secure OTP dispatched to ${normalizedPhone}`);
      } else {
        console.log(`[OTP DEV MODE FALLBACK] ${normalizedPhone} → ${generatedOtp}`);
      }

      return NextResponse.json({
        success: true,
        message: "OTP sent successfully.",
        // Shown only in dev mode so you can test without SMS gateway
        demo_otp: (!process.env.TWILIO_ACCOUNT_SID && process.env.NODE_ENV !== "production") ? generatedOtp : undefined,
      });
    }

    // ── VERIFY OTP ──────────────────────────────────────────────────────────
    if (action === "verify") {
      if (!otp) {
        return NextResponse.json({ error: "OTP is required." }, { status: 400 });
      }

      const stored = otpStore.get(normalizedPhone);

      if (!stored) {
        return NextResponse.json(
          { error: "No OTP found. Please request a new one." },
          { status: 400 }
        );
      }

      if (Date.now() > stored.expiresAt) {
        otpStore.delete(normalizedPhone);
        return NextResponse.json(
          { error: "OTP has expired. Please request a new one." },
          { status: 400 }
        );
      }

      if (otp !== stored.otp) {
        return NextResponse.json(
          { error: "Incorrect OTP. Please try again." },
          { status: 400 }
        );
      }

      // ✅ Valid — clean up and confirm
      otpStore.delete(normalizedPhone);
      return NextResponse.json({ success: true, message: "Phone verified successfully!" });
    }

    return NextResponse.json({ error: "Invalid action. Use 'send' or 'verify'." }, { status: 400 });

  } catch (error: any) {
    console.error("OTP API Error:", error);
    return NextResponse.json(
      { error: error.message || "OTP service failed." },
      { status: 500 }
    );
  }
}

