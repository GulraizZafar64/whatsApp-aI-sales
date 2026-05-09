import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "whatsapp_ai_assistant_verify_token";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("WEBHOOK_VERIFIED");
    return new Response(challenge, { status: 200 });
  } else {
    return new Response("Forbidden", { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Check if it's a WhatsApp business account notification
    if (body.object === "whatsapp_business_account") {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const message = body.entry[0].changes[0].value.messages[0];
        const businessPhoneNumberId = body.entry[0].changes[0].value.metadata.phone_number_id;
        const from = message.from; // extract the phone number from the webhook payload
        const msgBody = message.text?.body; // extract the message text

        console.log(`Received message from ${from}: ${msgBody}`);

        // Save incoming message to Firestore
        await addDoc(collection(db, "messages"), {
          businessPhoneNumberId,
          from,
          text: msgBody,
          type: "incoming",
          status: "unread",
          timestamp: serverTimestamp()
        });

        // TODO: Logic to process message with AI and reply back
        // 1. Fetch business config from Firestore using businessPhoneNumberId
        // 2. Send msgBody to LLM (Gemini/OpenAI) with business context
        // 3. Send reply using Meta Graph API
      }
      return NextResponse.json({ status: "ok" });
    } else {
      return NextResponse.json({ status: "not a whatsapp notification" }, { status: 404 });
    }
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
