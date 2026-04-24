import twilio from "twilio";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const { phone, deliveryMethod = "sms" } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }

    const normalizedPhone = phone.toString().replace(/\s+/g, "").replace(/^00/, "+");

    const otp = Math.floor(100000 + Math.random() * 900000);
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    await setDoc(doc(db, "otps", normalizedPhone), {
      otp,
      expiresAt,
    });

    console.log("OTP:", otp); // temporary 

    // Integrate Twilio for Production SMS & WhatsApp Validation
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      let fromNumber = process.env.TWILIO_PHONE_NUMBER;
      let toNumber = normalizedPhone;

      if (deliveryMethod === "whatsapp") {
        fromNumber = process.env.TWILIO_WHATSAPP_NUMBER ? `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}` : `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;
        toNumber = `whatsapp:${normalizedPhone}`;
      }

      await client.messages.create({
        body: `*ResQAI* \nYour verification code is: *${otp}*.\nIt expires in 5 minutes.`,
        from: fromNumber,
        to: toNumber
      });
      console.log(`[Twilio ${deliveryMethod.toUpperCase()}] Secure OTP dispatched to ${normalizedPhone}`);
    } else {
      console.log(`[OTP DEV MODE FALLBACK] ${normalizedPhone} (${deliveryMethod}) → ${otp}`);
    }

    return NextResponse.json({ 
      success: true,
      demo_otp: (!process.env.TWILIO_ACCOUNT_SID && process.env.NODE_ENV !== "production") ? otp : undefined,
    });

  } catch (error) {
    console.error("Failed to send OTP", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      return NextResponse.json({ error: "Phone and OTP are required" }, { status: 400 });
    }

    const normalizedPhone = phone.toString().replace(/\s+/g, "").replace(/^00/, "+");

    const docRef = doc(db, "otps", normalizedPhone);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return NextResponse.json({ error: "OTP not found" }, { status: 400 });
    }

    const data = snap.data();

    if (Date.now() > data.expiresAt) {
      await deleteDoc(docRef);
      return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    }

    if (parseInt(otp) !== data.otp) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    await deleteDoc(docRef);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Verification failed", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
