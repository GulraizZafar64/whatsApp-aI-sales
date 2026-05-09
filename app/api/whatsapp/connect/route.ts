import { NextResponse } from "next/server";

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET; // This should be in .env.local but not public

export async function POST(request: Request) {
  try {
    const { accessToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json({ error: "Missing access token" }, { status: 400 });
    }

    // Step 1: Optional - Exchange for long-lived token if needed
    // For MVP, we can use the user token to fetch business info

    // Step 2: Fetch WhatsApp Business Accounts (WABA)
    // We'll try to fetch directly from the whatsapp_business_accounts edge first
    let wabaResponse = await fetch(
      `https://graph.facebook.com/v21.0/me/whatsapp_business_accounts?access_token=${accessToken}`
    );
    let wabaData = await wabaResponse.json();

    console.log("Meta WABA Response:", JSON.stringify(wabaData, null, 2));

    // If direct edge fails, try the /me endpoint with fields
    if (wabaData.error && wabaData.error.code === 100) {
      console.log("Direct edge failed, trying /me endpoint...");
      wabaResponse = await fetch(
        `https://graph.facebook.com/v21.0/me?fields=id,name,whatsapp_business_accounts&access_token=${accessToken}`
      );
      wabaData = await wabaResponse.json();
    }

    // Check for the specific error about non-existing field
    if (wabaData.error && wabaData.error.code === 100) {
      return NextResponse.json({
        error: "Meta API Restriction: Your Meta App is likely not a 'Business' app type. To fix this, go to Meta Developers Dashboard -> App Settings -> Basic and ensure 'App Type' is set to 'Business'. Also ensure you have added the 'WhatsApp' product to your app.",
        meta_debug: wabaData
      }, { status: 400 });
    }

    if (wabaData.error) {
      return NextResponse.json({
        error: `Meta API Error: ${wabaData.error.message}`,
        meta_debug: wabaData
      }, { status: 400 });
    }

    const accounts = wabaData.data || wabaData.whatsapp_business_accounts?.data;

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        error: "No WhatsApp Business Accounts found. Please ensure you have a WhatsApp Business Account and that you granted permission to access it in the Meta popup.",
        meta_debug: wabaData
      }, { status: 404 });
    }

    const businessAccountId = accounts[0].id;

    // Step 3: Fetch Phone Numbers for this WABA
    const phoneResponse = await fetch(
      `https://graph.facebook.com/v21.0/${businessAccountId}/phone_numbers?access_token=${accessToken}`
    );
    const phoneData = await phoneResponse.json();

    if (!phoneData.data || phoneData.data.length === 0) {
      return NextResponse.json({ error: "No phone numbers found for this account" }, { status: 404 });
    }

    // Pick the first verified number
    const phoneNumber = phoneData.data[0];

    return NextResponse.json({
      success: true,
      accessToken: accessToken, // In production, exchange this for a permanent System User Token
      businessAccountId: businessAccountId,
      phoneNumberId: phoneNumber.id,
      whatsappNumber: phoneNumber.display_phone_number,
    });
  } catch (error) {
    console.error("Meta Connection Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
