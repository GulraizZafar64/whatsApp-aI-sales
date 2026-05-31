import { businessTypeKind, isValidBusinessType } from "@/lib/business-type";

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
        ? "Description (ingredients, spice level, etc.)"
        : formKind === "booking"
          ? "What is included & how to book"
          : formKind === "lead"
            ? "Qualifying details for the bot"
            : "Description",

    descriptionPlaceholder:
      formKind === "food"
        ? "e.g. Grilled chicken, served with rice and salad"
        : formKind === "ecommerce"
          ? "Materials, care instructions, shipping notes…"
          : formKind === "booking"
            ? "Duration, location, what the client should prepare…"
            : formKind === "lead"
              ? "Budget range, location, timeline, questions to ask…"
              : "Describe what you sell",

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
    showDiscount: true,
    showBargaining: formKind === "ecommerce" || formKind === "food",
  };
}
