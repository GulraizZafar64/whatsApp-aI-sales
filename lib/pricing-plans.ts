export type PricingPlanId = "starter" | "pro" | "enterprise";

export type PricingPlan = {
  id: PricingPlanId;
  name: string;
  tagline: string;
  price: string | null;
  priceNote?: string;
  highlighted?: boolean;
  connections: { text: string; badge?: string }[];
  features: { text: string; included: boolean; bold?: boolean }[];
  cta: string;
  ctaVariant: "outline" | "primary" | "contact";
};

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Perfect for small businesses",
    price: "$19",
    connections: [
      { text: "Up to 1,000 AI replies" },
      { text: "500 contacts" },
    ],
    features: [
      { text: "AI product selling bot", included: true },
      { text: "Add & manage products", included: true },
      { text: "Order tracking dashboard", included: true },
      { text: "Blacklist numbers", included: true },
      { text: "Email order notifications", included: true },
      { text: "API access", included: false },
      { text: "Basic support", included: true },
    ],
    cta: "Choose Starter",
    ctaVariant: "outline",
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For growing sales teams",
    price: "$49",
    highlighted: true,
    connections: [
      { text: "Up to 5,000 AI replies" },
      { text: "Unlimited contacts", badge: "Unlimited" },
    ],
    features: [
      { text: "AI product selling bot", included: true },
      { text: "Add & manage products", included: true },
      { text: "Order tracking dashboard", included: true },
      { text: "Blacklist numbers", included: true },
      { text: "Email + WhatsApp order alerts", included: true },
      { text: "Custom AI instruction", included: true },
      { text: "API access", included: false },
      { text: "Basic support", included: true },
    ],
    cta: "Get Started with Pro",
    ctaVariant: "primary",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Full power + API access",
    price: null,
    priceNote: "Our team will share pricing with you",
    connections: [
      { text: "Unlimited AI replies" },
      { text: "Unlimited contacts", badge: "Unlimited" },
    ],
    features: [
      { text: "AI product selling bot", included: true },
      { text: "Add & manage products", included: true },
      { text: "Order tracking dashboard", included: true },
      { text: "Blacklist numbers", included: true },
      { text: "Email + WhatsApp order alerts", included: true },
      { text: "Custom AI instruction", included: true },
      { text: "Full REST API access + API key", included: true, bold: true },
      { text: "Custom features", included: true },
      {
        text: "Personal support with developer help",
        included: true,
        bold: true,
      },
    ],
    cta: "Contact Sales",
    ctaVariant: "contact",
  },
];
