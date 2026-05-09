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
    // We will use the /debug_token endpoint to inspect the granted target_ids for whatsapp_business_management
    const appAccessToken = `${META_APP_ID}|${META_APP_SECRET}`;
    
    const debugResponse = await fetch(
      `https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}&access_token=${appAccessToken}`
    );
    const debugData = await debugResponse.json();

    console.log("Meta Debug Token Response:", JSON.stringify(debugData, null, 2));

    if (debugData.error || !debugData.data || !debugData.data.is_valid) {
      return NextResponse.json({
        error: "Invalid access token or token expired.",
        meta_debug: debugData
      }, { status: 400 });
    }

    let wabaIds: string[] = [];

    // Find the granular scope for whatsapp_business_management
    if (debugData.data.granular_scopes) {
      const wabaScope = debugData.data.granular_scopes.find(
        (scope: any) => scope.scope === "whatsapp_business_management"
      );
      if (wabaScope && wabaScope.target_ids) {
        wabaIds = wabaScope.target_ids;
      }
    }

    // Fallback: If no granular scopes are returned, we might not have specific target IDs,
    // but without target IDs we can't fetch WABA directly. The new granular scopes flow is required.
    if (wabaIds.length === 0) {
      return NextResponse.json({
        error: "No WhatsApp Business Accounts found. Please ensure you have created a WABA and selected it during the Meta authorization popup.",
        meta_debug: debugData
      }, { status: 404 });
    }

    const businessAccountId = wabaIds[0];

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
