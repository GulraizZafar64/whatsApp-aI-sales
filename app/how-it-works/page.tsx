import Link from "next/link";
import { HeroChatDemo } from "@/components/landing/HeroChatDemo";

const STEPS = [
  {
    n: "01",
    title: "Create your account",
    icon: "person_add",
    desc: "Sign up with email and password. You get your own secure dashboard — no technical setup on your phone or server.",
    details: [
      "One account per business",
      "Log in from any browser",
      "Your data stays private to your business",
    ],
  },
  {
    n: "02",
    title: "Connect WhatsApp",
    icon: "qr_code_2",
    desc: "Open the dashboard and scan the QR code with your business WhatsApp — the same way you link WhatsApp Web. Your number stays on your phone; we only run the automation layer.",
    details: [
      "Uses your existing WhatsApp Business or personal business number",
      "Connection status shows Live in the dashboard",
      "Sessions reconnect automatically if the server restarts",
    ],
  },
  {
    n: "03",
    title: "Add your products",
    icon: "inventory_2",
    desc: "Build your catalog: product name, price, description, stock (in stock / out of stock), and photos. The AI reads this catalog on every customer message.",
    details: [
      "Unlimited products on paid plans",
      "Product images can be sent to customers in chat",
      "Out-of-stock items are explained with alternatives",
    ],
  },
  {
    n: "04",
    title: "AI already trained — manage your sales like this",
    icon: "smart_toy",
    desc: "The AI already knows how to sell on WhatsApp. You only fine-tune it in AI instruction: delivery cities, payment methods (JazzCash, bank, COD), returns, and your tone — Professional, Friendly, or Cool.",
    details: [
      "Pre-built sales flow — you adjust rules, not build from scratch",
      "Custom instructions apply to every AI reply",
      "Pro & Enterprise: full AI instruction editor",
    ],
  },
  {
    n: "05",
    title: "Set checkout rules",
    icon: "tune",
    desc: "In Checkout settings, choose what the customer must send before an order is saved — for example delivery address, screenshot of delivery payment, or order payment proof.",
    details: [
      "You control required steps per business",
      "AI won’t mark an order complete until requirements are met",
      "Reduces fake or incomplete orders",
    ],
  },
  {
    n: "06",
    title: "Turn on AI auto-reply",
    icon: "toggle_on",
    desc: "Flip the AI switch in the navbar or dashboard. From that moment, new WhatsApp messages get an AI reply using your catalog, instructions, and chat history.",
    details: [
      "Turn off anytime — you can reply manually in the inbox",
      "AI uses the last 80 messages in that chat for context",
      "Supports text, voice notes, and images from customers",
    ],
  },
  {
    n: "07",
    title: "Customer chats — AI sells",
    icon: "chat",
    desc: "A customer asks about a product, size, or price. The AI answers instantly, sends a product photo the first time they mention it, and guides them to buy — in their language.",
    details: [
      "Answers FAQs from your instructions",
      "Confirms product, quantity, and price before checkout",
      "Handles voice notes and photos intelligently",
    ],
  },
  {
    n: "08",
    title: "Orders land in your dashboard",
    icon: "check_circle",
    desc: "When checkout is complete, the order appears in Orders with customer details and line items. You accept, dispatch, and mark complete — or delete mistakes.",
    details: [
      "Statuses: pending → accepted → dispatched → complete",
      "Pending orders can be updated if the customer changes their mind",
      "After accepted, changes create a new pending order (safe workflow)",
    ],
  },
  {
    n: "09",
    title: "You stay in control",
    icon: "dashboard",
    desc: "Use the inbox to read and reply manually, blacklist spam numbers, view activity stats, and monitor unread chats. You’re always the boss — AI is your assistant.",
    details: [
      "WhatsApp inbox with search",
      "Blacklist unwanted numbers",
      "Stats: chats, AI replies, unread, connection",
    ],
  },
] as const;

const FLOW = [
  { who: "Customer", text: "Hi, do you have the black shirt in Large?", side: "user" as const },
  {
    who: "AI",
    text: "Yes! Black Shirt — Large is in stock for $50. Want me to start your order?",
    side: "ai" as const,
  },
  { who: "Customer", text: "Yes, 2 pieces please", side: "user" as const },
  {
    who: "AI",
    text: "Perfect — 2× Black Shirt (Large) = $100. Please send your full delivery address.",
    side: "ai" as const,
  },
  { who: "Customer", text: "House 12, Street 5, Karachi", side: "user" as const },
  {
    who: "AI",
    text: "Thanks! Order received — pending confirmation. We’ll update you when it’s accepted.",
    side: "ai" as const,
  },
];

export default function HowItWorksPage() {
  return (
    <main className="overflow-x-hidden">
      {/* Hero */}
      <section className="pt-8 sm:pt-12 pb-10 sm:pb-14 px-4 sm:px-6 lg:px-8 text-center max-w-[1200px] mx-auto">
        <span className="inline-block px-3 py-1 rounded-full bg-primary-container/10 text-on-primary-container text-xs sm:text-label-sm font-semibold mb-4 sm:mb-6">
          End-to-end guide
        </span>
        <h1 className="text-2xl sm:text-3xl md:text-display-xl font-bold text-on-background mb-4 sm:mb-6">
          How WhatsApp AI Sales works
        </h1>
        <p className="text-sm sm:text-base md:text-body-lg text-secondary max-w-2xl mx-auto mb-2">
          From sign-up to your first automated sale — here is the full journey, step by step.
        </p>
        <p className="text-xs sm:text-sm text-secondary max-w-xl mx-auto">
          No coding. No new app for customers. They message you on WhatsApp like always — your
          AI handles the conversation and logs orders in your dashboard.
        </p>
      </section>

      {/* Overview diagram */}
      <section className="px-4 sm:px-6 lg:px-8 pb-10 sm:pb-14 max-w-[1200px] mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { icon: "login", label: "Sign up" },
            { icon: "qr_code_2", label: "Connect WA" },
            { icon: "inventory_2", label: "Add products" },
            { icon: "smart_toy", label: "Manage AI" },
            { icon: "toggle_on", label: "AI on" },
            { icon: "chat", label: "Customer chats" },
            { icon: "shopping_cart", label: "Checkout" },
            { icon: "check_circle", label: "Orders" },
          ].map((s, i) => (
            <div
              key={s.label}
              className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-surface-container-lowest border border-gray-100"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#25D366]/15 text-[#25D366] text-sm font-bold">
                {i + 1}
              </span>
              <span className="material-symbols-outlined text-primary text-[22px]">{s.icon}</span>
              <span className="text-sm font-semibold text-on-background">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Detailed steps */}
      <section className="px-4 sm:px-6 lg:px-8 py-10 sm:py-14 bg-surface-container-low">
        <div className="max-w-[1200px] mx-auto space-y-6 sm:space-y-8">
          {STEPS.map((step) => (
            <article
              key={step.n}
              className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-5 sm:p-8 shadow-sm"
            >
              <div className="flex flex-col md:flex-row gap-5 sm:gap-8">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3 sm:mb-4">
                    <span className="text-2xl sm:text-3xl font-bold text-[#25D366]/30">
                      {step.n}
                    </span>
                    <span className="material-symbols-outlined text-primary text-[28px]">
                      {step.icon}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl md:text-headline-sm font-semibold text-on-background mb-2 sm:mb-3">
                    {step.title}
                  </h2>
                  <p className="text-sm sm:text-base text-secondary leading-relaxed mb-4 sm:mb-5">
                    {step.desc}
                  </p>
                  <ul className="space-y-2">
                    {step.details.map((d) => (
                      <li
                        key={d}
                        className="flex items-center gap-2 text-xs sm:text-sm text-on-surface-variant"
                      >
                        <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">
                          check_circle
                        </span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Example conversation */}
      <section className="px-4 sm:px-6 lg:px-8 py-10 sm:py-14 max-w-[1200px] mx-auto">
        <div className="grid md:grid-cols-2 gap-8 sm:gap-12 items-start">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-display-lg font-bold text-on-background mb-4 sm:mb-6">
              Example: one sale from start to finish
            </h2>
            <p className="text-sm sm:text-base text-secondary mb-6 sm:mb-8 leading-relaxed">
              This is what happens behind the scenes. The customer only sees WhatsApp — you see
              the order in your dashboard when checkout rules are satisfied.
            </p>
            <div className="space-y-4 sm:space-y-5">
              {[
                {
                  icon: "schedule",
                  title: "Seconds, not hours",
                  text: "AI replies while you are busy or asleep.",
                },
                {
                  icon: "history",
                  title: "Remembers the chat",
                  text: "Uses recent messages so it doesn’t ask the same question twice.",
                },
                {
                  icon: "verified",
                  title: "Real orders only",
                  text: "Orders save only after your checkout settings are met.",
                },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">{item.icon}</span>
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-on-background mb-1">
                      {item.title}
                    </h4>
                    <p className="text-sm text-secondary">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-[#075E54] px-4 py-3 text-white text-sm font-semibold">
              Live chat example
            </div>
            <div className="p-4 sm:p-5 space-y-3 bg-[#e5ddd5] min-h-[320px]">
              {FLOW.map((msg, i) => (
                <div
                  key={i}
                  className={`max-w-[90%] p-3 rounded-lg text-xs sm:text-sm shadow-sm ${
                    msg.side === "user"
                      ? "bg-white text-on-surface self-start ml-0 mr-auto"
                      : "bg-[#dcf8c6] text-on-surface self-end ml-auto mr-0"
                  }`}
                >
                  <span className="block text-[10px] font-semibold text-[#6b7280] mb-1">
                    {msg.who}
                  </span>
                  {msg.text}
                </div>
              ))}
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-secondary flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">
                check_circle
              </span>
              Order appears in dashboard → you accept & dispatch
            </div>
          </div>
        </div>
      </section>

      {/* Demo + FAQ */}
      <section className="bg-surface-container-low px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-on-background mb-4">
              Watch the AI demo
            </h2>
            <p className="text-sm sm:text-base text-secondary mb-6">
              See how fast the assistant answers product questions and moves the customer toward
              a purchase.
            </p>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:underline"
            >
              Open full demo page
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </Link>
          </div>
          <HeroChatDemo />
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 py-10 sm:pb-14 max-w-[800px] mx-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-center text-on-background mb-8 sm:mb-10">
          Common questions
        </h2>
        <div className="space-y-6 sm:space-y-8">
          {[
            {
              q: "Do customers need to install anything?",
              a: "No. They use normal WhatsApp and message your business number.",
            },
            {
              q: "Can I reply myself?",
              a: "Yes. Use the inbox anytime. Turn AI off if you want full manual control.",
            },
            {
              q: "What if the AI is wrong?",
              a: "Update products, stock, and AI instructions — the next reply uses the new data. You can also take over the chat manually.",
            },
            {
              q: "How long does setup take?",
              a: "Most businesses connect WhatsApp and add a few products in under 30 minutes.",
            },
          ].map((faq) => (
            <div key={faq.q} className="border-b border-gray-100 pb-5 sm:pb-6">
              <h3 className="text-base font-semibold text-on-background mb-2">{faq.q}</h3>
              <p className="text-sm text-secondary">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16 max-w-[1200px] mx-auto">
        <div className="bg-[#25D366] rounded-2xl sm:rounded-[2rem] p-8 sm:p-12 md:p-16 text-center text-white relative overflow-hidden">
          <h2 className="text-xl sm:text-2xl md:text-display-lg font-bold mb-3 sm:mb-4 relative z-10">
            Start automating your WhatsApp today
          </h2>
          <p className="text-sm sm:text-base text-white/90 mb-6 sm:mb-8 max-w-lg mx-auto relative z-10">
            Follow the steps above — sign up, connect, add products, and turn AI on.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center relative z-10">
            <Link
              href="/sign-up"
              className="inline-flex justify-center bg-white text-[#25D366] px-8 py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base hover:shadow-lg transition-all"
            >
              Get Started Free
            </Link>
            <Link
              href="/features"
              className="inline-flex justify-center border border-white/40 text-white px-8 py-3 sm:py-4 rounded-xl font-semibold text-sm sm:text-base hover:bg-white/10 transition-all"
            >
              View all features
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
