import { NextResponse } from "next/server";
import twilio from "twilio";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(req: Request) {
  try {
    const { title, message, channels, ngoId } = await req.json();

    if (!title || !message || !channels || !channels.length) {
      return NextResponse.json({ error: "title, message, and channels are required" }, { status: 400 });
    }

    // Only proceed if SMS or WhatsApp channels are selected
    const wantsSMS = channels.includes("sms");
    const wantsWhatsApp = channels.includes("whatsapp");

    if (!wantsSMS && !wantsWhatsApp) {
      return NextResponse.json({ success: true, skipped: true, reason: "No SMS/WhatsApp channels selected" });
    }

    // Guard: Twilio must be configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.warn("[Broadcast SMS] Twilio not configured — skipping SMS dispatch");
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "Twilio not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to .env.local",
      });
    }

    // Fetch all volunteer phone numbers
    const q = query(collection(db, "users"), where("role", "==", "volunteer"));
    const snap = await getDocs(q);

    const recipients: Array<{ phone: string; whatsapp: string }> = [];
    snap.docs.forEach((d) => {
      const data = d.data();
      if (data.phoneNo) {
        recipients.push({
          phone: data.phoneNo,
          whatsapp: data.whatsappNo || data.phoneNo,
        });
      }
    });

    if (recipients.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: "No volunteers with phone numbers found" });
    }

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const body = `📢 *ResQAI Alert*\n\n*${title}*\n\n${message}\n\n— ResQAI Platform`;

    let sent = 0;
    const errors: string[] = [];

    // Batch all send promises (respect Twilio rate limits via Promise.allSettled)
    const promises = recipients.flatMap((r) => {
      const jobs = [];
      if (wantsSMS) {
        jobs.push(
          client.messages
            .create({ body, from: process.env.TWILIO_PHONE_NUMBER!, to: r.phone })
            .then(() => { sent++; })
            .catch((e) => errors.push(`SMS to ${r.phone}: ${e.message}`))
        );
      }
      if (wantsWhatsApp && process.env.TWILIO_WHATSAPP_NUMBER) {
        const waFrom = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
        const waTo = `whatsapp:${r.whatsapp}`;
        jobs.push(
          client.messages
            .create({ body, from: waFrom, to: waTo })
            .then(() => { sent++; })
            .catch((e) => errors.push(`WhatsApp to ${r.whatsapp}: ${e.message}`))
        );
      }
      return jobs;
    });

    await Promise.allSettled(promises);

    console.log(`[Broadcast SMS] Sent: ${sent}, Errors: ${errors.length}`);

    return NextResponse.json({ success: true, sent, errors: errors.length > 0 ? errors : undefined });
  } catch (error: any) {
    console.error("[Broadcast SMS] Failed:", error);
    return NextResponse.json({ error: error.message || "Broadcast SMS failed" }, { status: 500 });
  }
}
