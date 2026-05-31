import { createProductFormConfig } from "@/lib/product-form-config";

export const DASHBOARD_NAV = [
  { href: "/dashboard", icon: "forum", label: "Chats", exact: true },
  { href: "/dashboard/products", icon: "inventory_2", label: "Products" },
  { href: "/dashboard/orders", icon: "check_circle", label: "Orders" },
  { href: "/dashboard/activity", icon: "insights", label: "Activity" },
  { href: "/dashboard/ai-instruction", icon: "smart_toy", label: "AI instruction" },
  { href: "/dashboard/blacklist", icon: "block", label: "Blacklist" },
] as const;

export type DashboardAppBar = {
  icon: string;
  title: string;
  subtitle: string;
};

const STATIC_APP_BARS: Record<string, DashboardAppBar> = {
  orders: {
    icon: "check_circle",
    title: "Orders",
    subtitle: "WhatsApp orders and manual sales",
  },
  activity: {
    icon: "insights",
    title: "Activity",
    subtitle: "AI vs manual message totals",
  },
  ai: {
    icon: "smart_toy",
    title: "AI instruction",
    subtitle: "Business context, tone, and scripted replies",
  },
  blacklist: {
    icon: "block",
    title: "Blacklist",
    subtitle: "Block numbers you do not want to serve",
  },
  inbox: {
    icon: "forum",
    title: "WhatsApp Inbox",
    subtitle: "Chats from your business number",
  },
};

export function isNavActive(
  pathname: string,
  href: string,
  exact?: boolean
): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getDashboardAppBar(
  pathname: string,
  businessType: string | null
): DashboardAppBar {
  if (pathname.startsWith("/dashboard/products")) {
    return {
      icon: "inventory_2",
      title: "Products",
      subtitle: createProductFormConfig(businessType).panelHint,
    };
  }
  if (pathname.startsWith("/dashboard/orders")) return STATIC_APP_BARS.orders;
  if (pathname.startsWith("/dashboard/activity")) return STATIC_APP_BARS.activity;
  if (pathname.startsWith("/dashboard/ai-instruction")) return STATIC_APP_BARS.ai;
  if (pathname.startsWith("/dashboard/blacklist")) return STATIC_APP_BARS.blacklist;
  return STATIC_APP_BARS.inbox;
}
