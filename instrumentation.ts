export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Do not await WhatsApp restore — it can take minutes (Puppeteer/Chromium).
    // The dev server and dashboard must be reachable immediately on `npm run dev`.
    console.log(
      "[instrumentation] server boot — WhatsApp restore running in background"
    );
    void (async () => {
      try {
        const { ensureDb } = await import("@/lib/sequelize");
        await ensureDb();
        const { initWhatsAppSessionStorage, ensureWhatsAppRestoreStarted } =
          await import("@/lib/whatsapp-web/manager");
        await initWhatsAppSessionStorage();
        await ensureWhatsAppRestoreStarted();
        console.log("[instrumentation] WhatsApp startup restore complete");
      } catch (err) {
        console.error("[instrumentation] WhatsApp startup restore error:", err);
      }
    })();
  }
}
