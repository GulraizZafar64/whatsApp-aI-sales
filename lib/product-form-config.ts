import { businessTypeKind, isValidBusinessType } from "@/lib/business-type";
import type { PriceTierField } from "@/lib/product-description";

export type ProductFormKind =
  | "ecommerce"
  | "food"
  | "booking"
  | "lead"
  | "digital"
  | "default";

export function getProductFormKind(
  businessType: string | null | undefined
): ProductFormKind {
  const kind = businessTypeKind(businessType);
  if (kind === "food") return "food";
  if (kind === "physical") return "ecommerce";
  if (kind === "booking") return "booking";
  if (kind === "lead") return "lead";
  if (kind === "digital") return "digital";
  return "default";
}

export function createProductFormConfig(businessType: string | null | undefined) {
  const t = (businessType || "").trim();
  const formKind = getProductFormKind(businessType);

  return {
    formKind,
    businessTypeLabel: t || "Not set",
    panelHint:
      formKind === "ecommerce"
        ? "Add products with price, sizes, optional colors, and photos."
        : formKind === "food"
          ? "Add menu items with price, prep info, and portion options."
          : formKind === "booking"
            ? "Add services clients can book through chat."
            : formKind === "lead"
              ? "Add offers the bot uses to qualify leads for your team."
              : formKind === "digital"
                ? "Add digital products, licenses, or subscription access."
                : isValidBusinessType(t)
                  ? "Complete your business type in profile so this form matches how you sell."
                  : "Set your business type in profile to unlock the right fields.",

    productNameLabel:
      formKind === "food"
        ? "Menu item name *"
        : formKind === "booking"
          ? "Service name *"
          : formKind === "lead"
            ? "Offer / listing name *"
            : "Product name *",

    descriptionLabel:
      formKind === "food"
        ? "Item details (ingredients, spice, what is included)"
        : formKind === "ecommerce"
          ? "Product details (fabric, fit, care)"
          : formKind === "booking"
            ? "What is included & how to book"
          : formKind === "lead"
            ? "Qualifying details for the bot"
            : "Description",

    descriptionPlaceholder:
      formKind === "food"
        ? "e.g. Grilled chicken with rice and salad. Spicy. Serves 1 on full plate."
        : formKind === "ecommerce"
          ? "e.g. Cotton shirt, slim fit. Available in colors listed below."
          : formKind === "booking"
            ? "Duration, location, what the client should prepare…"
            : formKind === "lead"
              ? "Budget range, location, timeline, questions to ask…"
              : "Describe what you sell",

    descriptionHint:
      formKind === "food"
        ? "Write what the dish is. Below, set every portion price (full, half, small). The AI must quote from those prices when the customer picks a size."
        : formKind === "ecommerce"
          ? "Write what the product is. Below, set price for each size (small shirt, medium, large, etc.). The AI uses these when the customer chooses a size."
          : formKind === "booking"
            ? "Include duration, location, and what the client should send to book."
            : formKind === "lead"
              ? "Include budget range, area, timeline, and questions the bot should ask."
              : "Describe your offer clearly so the AI can answer customers.",

    descriptionRows: formKind === "food" || formKind === "ecommerce" ? 4 : 3,

    showPriceTiers: formKind === "food" || formKind === "ecommerce",
    priceTiers:
      formKind === "food"
        ? ([
            {
              key: "full",
              label: "Full / regular plate price",
              placeholder: "e.g. 500",
            },
            {
              key: "half",
              label: "Half portion price",
              placeholder: "e.g. 300",
            },
            {
              key: "small",
              label: "Small portion price",
              placeholder: "e.g. 200",
            },
          ] satisfies PriceTierField[])
        : formKind === "ecommerce"
          ? ([
              {
                key: "small",
                label: "Small size price",
                placeholder: "e.g. 1200",
              },
              {
                key: "medium",
                label: "Medium size price",
                placeholder: "e.g. 1500",
              },
              {
                key: "large",
                label: "Large size price",
                placeholder: "e.g. 1800",
              },
            ] satisfies PriceTierField[])
          : ([] as PriceTierField[]),

    priceFieldHint:
      formKind === "food"
        ? "List every portion price. Price above is the default (usually full plate) for quick checkout."
        : formKind === "ecommerce"
          ? "List every size price. Price above is the default (usually medium) for quick checkout."
          : "",

    showStockQuantity: false,
    showSubtractOnOrder: false,

    showSizes: formKind === "ecommerce",
    sizesLabel: "Sizes *",
    sizesPlaceholder: "S, M, L, XL",
    sizesRequired: formKind === "ecommerce",

    showColors: formKind === "ecommerce",
    colorsLabel: "Colors / variants (optional)",
    colorsPlaceholder: "Red, Navy, Black",
    colorsRequired: false,

    showPortions: formKind === "food",
    portionsLabel: "Portions / add-ons (optional)",
    portionsPlaceholder: "Regular, Large, Extra cheese",

    showPrepTime: formKind === "food",
    showAllergens: formKind === "food",

    showBrand: formKind === "ecommerce",
    showImages: formKind !== "lead",
    showDiscount: formKind !== "lead",
    /** Negotiation floor price — physical retail only */
    showBargaining: formKind === "ecommerce",

    variantColumnLabel:
      formKind === "ecommerce"
        ? "Sizes / colors"
        : formKind === "food"
          ? "Portions"
          : formKind === "booking"
            ? "Options"
            : formKind === "lead" || formKind === "digital"
              ? ""
              : "Variants",
  };
}
