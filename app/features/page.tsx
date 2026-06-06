import Link from "next/link";

const FEATURE_GROUPS = [
  {
    title: "AI & WhatsApp conversations",
    subtitle: "Your 24/7 sales assistant on WhatsApp",
    items: [
      {
        icon: "bolt",
        title: "Instant AI auto-reply",
        desc: "Turn AI on or off from the navbar or dashboard. Every inbound WhatsApp message can get an automatic reply in seconds — even when you are offline.",
      },
      {
        icon: "psychology",
        title: "Smart understanding",
        desc: "The AI reads customer intent from normal chat — typos, slang, Urdu, English, and mixed language. It uses your last 80 messages in that chat for context on every reply.",
      },
      {
        icon: "mic",
        title: "Voice note support",
        desc: "Customers can send voice messages. The app transcribes them and the AI replies in the same language as the transcript.",
      },
      {
        icon: "image",
        title: "Image understanding",
        desc: "When a customer sends a product photo, the AI can use what it sees to suggest items from your catalog and help them order.",
      },
      {
        icon: "photo_library",
        title: "Product photos in chat",
        desc: "The first time a customer asks about a product, the server can send that product’s image once. It won’t spam the same photo again unless they ask.",
      },
      {
        icon: "translate",
        title: "Multi-language replies",
        desc: "Replies match the customer’s language — Chinese, French, German, Spanish, Urdu, Hindi, English, Arabic, and more — based on how they write or speak.",
      },
      {
        icon: "mood",
        title: "Reply tone",
        desc: "Choose Professional, Friendly, or Cool tone so every AI message sounds like your brand, not a generic bot.",
      },
      {
        icon: "smart_toy",
        title: "Custom AI instruction",
        desc: "Write your own business rules: delivery areas, payment methods, policies, and scripts. Pro and Enterprise plans include full custom instruction editing.",
      },
    ],
  },
  {
    title: "Products & catalog",
    subtitle: "Teach the AI what you sell",
    items: [
      {
        icon: "inventory_2",
        title: "Product catalog",
        desc: "Add products with name, price, description, stock status, and images. The AI uses this live catalog in every reply.",
      },
      {
        icon: "category",
        title: "Business types",
        desc: "Set up for retail, services, food, and more — product fields adapt to how your business sells.",
      },
      {
        icon: "sell",
        title: "Stock & pricing answers",
        desc: "The AI tells customers when items are in or out of stock and suggests alternatives from your catalog.",
      },
      {
        icon: "forum",
        title: "WhatsApp inbox",
        desc: "See all chats in one place. Search conversations, read history, and send manual replies when you want to take over.",
      },
      {
        icon: "person",
        title: "Contact names & numbers",
        desc: "Chats show customer names and phone numbers so your team always knows who they are talking to.",
      },
    ],
  },
  {
    title: "Orders & checkout",
    subtitle: "From chat to confirmed order",
    items: [
      {
        icon: "shopping_cart_checkout",
        title: "Guided checkout in chat",
        desc: "The AI confirms product, quantity, and price, then collects what you require — delivery address, delivery payment screenshot, order payment screenshot, or other steps you configure.",
      },
      {
        icon: "tune",
        title: "Checkout settings",
        desc: "Choose exactly what the customer must send before an order is saved: address only, payment proof, or custom requirements per business.",
      },
      {
        icon: "check_circle",
        title: "Orders dashboard",
        desc: "All WhatsApp orders appear in one table. Track status: pending, accepted, dispatched, and complete.",
      },
      {
        icon: "edit_note",
        title: "Pending order updates",
        desc: "If an order is still pending, customer changes update the same order. Once accepted, new changes create a fresh pending order — nothing gets overwritten by mistake.",
      },
      {
        icon: "local_shipping",
        title: "Order actions",
        desc: "Accept, dispatch, complete, or delete orders from the dashboard. Customers can ask about old orders and the AI uses real order history.",
      },
      {
        icon: "mail",
        title: "Order notifications",
        desc: "Get notified when new orders come in so your team can pack and ship without watching WhatsApp all day.",
      },
    ],
  },
  {
    title: "Control, safety & insights",
    subtitle: "Run the business your way",
    items: [
      {
        icon: "qr_code_2",
        title: "WhatsApp connection",
        desc: "Link your business number with a QR code (like WhatsApp Web). Sessions reconnect automatically after server restarts.",
      },
      {
        icon: "toggle_on",
        title: "AI on/off switch",
        desc: "Pause AI anytime from the dashboard or mobile navbar without disconnecting WhatsApp.",
      },
      {
        icon: "block",
        title: "Blacklist",
        desc: "Block phone numbers you do not want to serve. Blacklisted contacts won’t get AI replies.",
      },
      {
        icon: "insights",
        title: "Activity & stats",
        desc: "See total chats, AI replies sent, unread messages, and connection status. Compare AI vs manual message activity over time.",
      },
      {
        icon: "schedule",
        title: "Follow-ups",
        desc: "Schedule follow-up WhatsApp messages so leads don’t go cold after the first conversation.",
      },
      {
        icon: "lock",
        title: "Secure accounts",
        desc: "Email sign-up, dashboard login, and per-business data — your catalog, chats, and orders stay in your account only.",
      },
    ],
  },
] as const;

export default function FeaturesPage() {
  return (
    <main className="overflow-x-hidden">
      <section className="pt-8 sm:pt-12 pb-10 sm:pb-14 px-4 sm:px-6 lg:px-8 text-center max-w-[1200px] mx-auto">
        <span className="inline-block px-3 py-1 rounded-full bg-primary-container/10 text-on-primary-container text-xs sm:text-label-sm font-semibold mb-4 sm:mb-6">
          Full feature list
        </span>
        <h1 className="text-2xl sm:text-3xl md:text-display-xl font-bold text-on-background mb-4 sm:mb-6">
          Everything WhatsApp AI Sales can do
        </h1>
        <p className="text-sm sm:text-base md:text-body-lg text-secondary max-w-2xl mx-auto">
          One platform to connect WhatsApp, train your AI, sell products, capture orders, and
          manage your team — built for real shops and sales teams.
        </p>
      </section>

      {FEATURE_GROUPS.map((group) => (
        <section
          key={group.title}
          className={`px-4 sm:px-6 lg:px-8 py-10 sm:py-14 ${
            group.title.includes("Control") ? "bg-surface-container-low" : "bg-white"
          }`}
        >
          <div className="max-w-[1200px] mx-auto">
            <div className="mb-8 sm:mb-12">
              <h2 className="text-xl sm:text-2xl md:text-headline-md font-semibold text-on-background mb-2">
                {group.title}
              </h2>
              <p className="text-sm sm:text-base text-secondary">{group.subtitle}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {group.items.map((item) => (
                <div
                  key={item.title}
                  className="p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-100 bg-surface-container-lowest hover:border-primary/20 hover:shadow-sm transition-all"
                >
                  <span className="material-symbols-outlined text-primary text-[28px] sm:text-[32px] mb-3 sm:mb-4 block">
                    {item.icon}
                  </span>
                  <h3 className="text-base sm:text-lg font-semibold text-on-background mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-secondary leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 max-w-[800px] mx-auto text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-on-background mb-4">
          Ready to use every feature?
        </h2>
        <p className="text-sm sm:text-base text-secondary mb-6 sm:mb-8">
          Create a free account, connect WhatsApp, and turn on AI auto-reply in minutes.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Link
            href="/sign-up"
            className="inline-flex justify-center bg-[#25D366] text-white px-6 py-3 rounded-xl font-bold text-sm sm:text-base hover:bg-[#20bd5a] transition-colors"
          >
            Get Started Free
          </Link>
          <Link
            href="/demo"
            className="inline-flex justify-center border border-outline-variant text-on-surface px-6 py-3 rounded-xl font-semibold text-sm sm:text-base hover:bg-surface-container-low transition-colors"
          >
            View demo
          </Link>
        </div>
      </section>
    </main>
  );
}
