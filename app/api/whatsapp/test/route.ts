import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { token, phoneNumberId } = await request.json();

    if (!token || !phoneNumberId) {
      return NextResponse.json({ error: "Missing token or Phone Number ID" }, { status: 400 });
    }

    // Attempt to fetch phone number details from Meta Graph API
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || "Failed to verify credentials" },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("WhatsApp Test Connection Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
