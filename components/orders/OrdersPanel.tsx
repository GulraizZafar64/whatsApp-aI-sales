"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { BallLoader } from "@/components/ui/BallLoader";
import { shouldToastDashboardApiError } from "@/lib/dashboard/api-errors";
import { formatMoney, currencySymbol, normalizeCurrency } from "@/lib/currency";
import { createProductFormConfig } from "@/lib/product-form-config";
import {
  mergeProductDescription,
  newPriceTierRow,
  parseDescriptionParts,
  stripCurrencyPrefix,
  type ParsedPriceTier,
} from "@/lib/product-description";
import {
  isAllowedProductImageFile,
  normalizeProductImageDataUrl,
} from "@/lib/product-image";
import {
  MAX_IMAGE_DECODED_BYTES,
  MAX_PRODUCT_IMAGES,
} from "@/lib/product-payload";
import { dashboardFetch } from "@/lib/dashboard/session";
import { parseCommaList } from "@/lib/parse-list";

export type ProductRow = {
  id: number;
  productName: string;
  productDescription: string | null;
  price: string;
  quantity: number;
  subtractOnOrder: boolean;
  discountEnabled: boolean;
  discountValue: string | null;
  discountIsPercent: boolean;
  discountValidDate: string | null;
  brandName: string | null;
  colors: string[];
  images: string[];
  bargainingLowAmount: string | null;
};

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function effectivePrice(p: ProductRow): number {
  const list = Number.parseFloat(p.price) || 0;
  if (!p.discountEnabled || p.discountValue == null) return list;
  if (p.discountValidDate) {
    const today = todayYmd();
    if (p.discountValidDate !== today) return list;
  }
  const dv = Number.parseFloat(p.discountValue) || 0;
  if (p.discountIsPercent) {
    return Math.max(0, list * (1 - dv / 100));
  }
  return Math.max(0, list - dv);
}

export function OrdersPanel() {
  const {
    bootstrapped,
    needsSetup,
    businessType: profileBusinessType,
    currency: profileCurrency,
  } = useDashboard();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [currency, setCurrency] = useState("PKR");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [subtractOnOrder, setSubtractOnOrder] = useState(false);
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountValue, setDiscountValue] = useState("");
  const [discountIsPercent, setDiscountIsPercent] = useState(true);
  const [discountValidDate, setDiscountValidDate] = useState("");
  const [brandName, setBrandName] = useState("");
  const [colorsText, setColorsText] = useState("");
  const [sizesText, setSizesText] = useState("");
  const [portionsText, setPortionsText] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [allergens, setAllergens] = useState("");
  const [bargainingLowAmount, setBargainingLowAmount] = useState("");
  const [useVariantPrices, setUseVariantPrices] = useState(false);
  const [priceTierRows, setPriceTierRows] = useState<
    (ParsedPriceTier & { id: string })[]
  >([newPriceTierRow()]);
  const [images, setImages] = useState<string[]>([]);

  const effectiveBusinessType =
    profileBusinessType?.trim() || businessType?.trim() || null;
  const effectiveCurrency = normalizeCurrency(
    profileCurrency || currency
  );
  const moneySym = currencySymbol(effectiveCurrency);

  const formCfg = useMemo(
    () => createProductFormConfig(effectiveBusinessType),
    [effectiveBusinessType]
  );

  const showVariantColumn =
    formCfg.showSizes || formCfg.showColors || formCfg.showPortions;

  useEffect(() => {
    if (profileBusinessType?.trim()) {
      setBusinessType(profileBusinessType.trim());
    }
  }, [profileBusinessType]);

  useEffect(() => {
    if (!modalOpen) return;
    if (!formCfg.showSizes) setSizesText("");
    if (!formCfg.showColors) setColorsText("");
    if (!formCfg.showPortions) setPortionsText("");
    if (!formCfg.showBrand) setBrandName("");
    if (!formCfg.showBargaining) setBargainingLowAmount("");
    if (!formCfg.showPrepTime) setPrepTime("");
    if (!formCfg.showAllergens) setAllergens("");
    if (!formCfg.showPriceTiers) {
      setUseVariantPrices(false);
      setPriceTierRows([newPriceTierRow()]);
    }
  }, [formCfg.formKind, modalOpen]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingId(null);
    setProductName("");
    setProductDescription("");
    setPrice("");
    setQuantity("0");
    setSubtractOnOrder(false);
    setDiscountEnabled(false);
    setDiscountValue("");
    setDiscountIsPercent(true);
    setDiscountValidDate("");
    setBrandName("");
    setColorsText("");
    setSizesText("");
    setPortionsText("");
    setPrepTime("");
    setAllergens("");
    setBargainingLowAmount("");
    setUseVariantPrices(false);
    setPriceTierRows([newPriceTierRow()]);
    setImages([]);
  }, []);

  const openAddModal = useCallback(() => {
    setEditingId(null);
    setProductName("");
    setProductDescription("");
    setPrice("");
    setQuantity("0");
    setSubtractOnOrder(false);
    setDiscountEnabled(false);
    setDiscountValue("");
    setDiscountIsPercent(true);
    setDiscountValidDate("");
    setBrandName("");
    setColorsText("");
    setSizesText("");
    setPortionsText("");
    setPrepTime("");
    setAllergens("");
    setBargainingLowAmount("");
    setUseVariantPrices(false);
    setPriceTierRows([newPriceTierRow()]);
    setImages([]);
    setModalOpen(true);
  }, []);

  const load = useCallback(async () => {
    if (!bootstrapped || needsSetup) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await dashboardFetch("/api/products", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err =
          typeof data.error === "string" ? data.error : "Could not load products.";
        if (shouldToastDashboardApiError(err)) {
          toast.error(err);
        }
        setProducts([]);
        return;
      }
      setProducts((data as { products?: ProductRow[] }).products ?? []);
      const bt = (data as { businessType?: string | null }).businessType;
      setBusinessType(typeof bt === "string" && bt.trim() ? bt.trim() : null);
      const cur = (data as { currency?: string | null }).currency;
      if (typeof cur === "string" && cur.trim()) {
        setCurrency(normalizeCurrency(cur));
      }
    } catch {
      toast.error("Network error loading products.");
    } finally {
      setLoading(false);
    }
  }, [bootstrapped, needsSetup]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onProfile = () => {
      void load();
    };
    window.addEventListener("businessProfileUpdated", onProfile);
    return () => window.removeEventListener("businessProfileUpdated", onProfile);
  }, [load]);

  const sizesArray = useMemo(() => parseCommaList(sizesText), [sizesText]);
  const colorsArray = useMemo(() => parseCommaList(colorsText), [colorsText]);
  const portionsArray = useMemo(() => parseCommaList(portionsText), [portionsText]);

  const variantValues = useMemo(() => {
    const out: string[] = [];
    if (formCfg.showSizes) out.push(...sizesArray);
    if (formCfg.showColors) out.push(...colorsArray);
    if (formCfg.showPortions) out.push(...portionsArray);
    return out;
  }, [formCfg, sizesArray, colorsArray, portionsArray]);

  function buildProductDescriptionForSave(base: string): string | null {
    const tiers =
      formCfg.showPriceTiers && useVariantPrices
        ? priceTierRows
            .filter((t) => t.label.trim() || t.amount.trim())
            .map((t) => ({
              label: t.label.trim(),
              amount: t.amount.trim(),
            }))
        : [];

    return mergeProductDescription({
      notes: base,
      tiers,
      currencyPrefix: moneySym,
      prepTime,
      allergens,
      showPrepTime: formCfg.showPrepTime,
      showAllergens: formCfg.showAllergens,
    });
  }

  function parseFoodExtrasFromDescription(desc: string | null) {
    if (!desc) return { base: "", prep: "", allergen: "" };
    const lines = desc.split("\n");
    const base: string[] = [];
    let prep = "";
    let allergen = "";
    for (const line of lines) {
      const prepM = line.match(/^Prep time:\s*(.+)$/i);
      const allergenM = line.match(/^Allergens:\s*(.+)$/i);
      if (prepM) prep = prepM[1].trim();
      else if (allergenM) allergen = allergenM[1].trim();
      else base.push(line);
    }
    return { base: base.join("\n").trim(), prep, allergen };
  }

  const fillForm = (p: ProductRow) => {
    const cfg = createProductFormConfig(effectiveBusinessType);
    setEditingId(p.id);
    setProductName(p.productName);
    setPrice(p.price);
    setQuantity(String(p.quantity));
    setSubtractOnOrder(p.subtractOnOrder);
    setDiscountEnabled(p.discountEnabled);
    setDiscountValue(p.discountValue ?? "");
    setDiscountIsPercent(p.discountIsPercent);
    setDiscountValidDate(p.discountValidDate ?? "");
    setBrandName(cfg.showBrand ? p.brandName ?? "" : "");
    setColorsText("");
    setSizesText("");
    setPortionsText("");
    const variants = p.colors.length ? p.colors.join(", ") : "";
    if (cfg.showPortions) {
      setPortionsText(variants);
    } else if (cfg.showSizes) {
      setSizesText(variants);
    } else if (cfg.showColors) {
      setColorsText(variants);
    }
    const descParts = parseDescriptionParts(p.productDescription);
    const foodBits = parseFoodExtrasFromDescription(descParts.notes);
    setProductDescription(foodBits.base);
    if (cfg.showPriceTiers && descParts.tiers.length > 0) {
      setUseVariantPrices(true);
      setPriceTierRows(
        descParts.tiers.map((t) =>
          newPriceTierRow({
            label: t.label,
            amount: stripCurrencyPrefix(t.amount, moneySym),
          })
        )
      );
    } else {
      setUseVariantPrices(false);
      setPriceTierRows([newPriceTierRow()]);
    }
    setPrepTime(foodBits.prep);
    setAllergens(foodBits.allergen);
    setBargainingLowAmount(p.bargainingLowAmount ?? "");
    setImages([...p.images]);
    setModalOpen(true);
  };

  const onPickImages = async (files: FileList | null) => {
    if (!files?.length) return;
    const next: string[] = [...images];
    const maxEach = MAX_IMAGE_DECODED_BYTES;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!isAllowedProductImageFile(f)) {
        toast.error(`Skipped "${f.name}" — only JPG and PNG are allowed.`);
        continue;
      }
      if (f.size > maxEach) {
        toast.error(`Skipped "${f.name}" (must be under 3 MB).`);
        continue;
      }
      if (next.length >= MAX_PRODUCT_IMAGES) {
        toast.error(`You can store at most ${MAX_PRODUCT_IMAGES} images per product.`);
        break;
      }
      const raw = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result ?? ""));
        r.onerror = () => reject(new Error("read"));
        r.readAsDataURL(f);
      });
      const b64 = normalizeProductImageDataUrl(raw);
      if (!b64) {
        toast.error(`Skipped "${f.name}" — could not read as JPG or PNG.`);
        continue;
      }
      next.push(b64);
    }
    setImages(next);
  };

  const submit = async () => {
    if (!productName.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (formCfg.sizesRequired && sizesArray.length === 0) {
      toast.error("Add at least one size (comma-separated).");
      return;
    }
    if (formCfg.colorsRequired && colorsArray.length === 0) {
      toast.error("Add at least one color (comma-separated).");
      return;
    }

    let pNum: number;
    if (formCfg.showPriceTiers && useVariantPrices) {
      const validTiers = priceTierRows.filter(
        (t) =>
          t.label.trim() &&
          Number.isFinite(Number.parseFloat(t.amount)) &&
          Number.parseFloat(t.amount) >= 0
      );
      if (!validTiers.length) {
        toast.error("Add at least one size/portion with a name and price.");
        return;
      }
      pNum = Number.parseFloat(validTiers[0]!.amount);
    } else {
      pNum = Number.parseFloat(price);
      if (!Number.isFinite(pNum) || pNum < 0) {
        toast.error("Enter a valid price.");
        return;
      }
    }

    const payload = {
      productName: productName.trim(),
      productDescription: buildProductDescriptionForSave(productDescription),
      price: pNum,
      quantity: 0,
      subtractOnOrder: false,
      discountEnabled,
      discountValue:
        discountEnabled && discountValue.trim()
          ? Number.parseFloat(discountValue)
          : null,
      discountIsPercent,
      discountValidDate:
        discountEnabled && discountValidDate.trim()
          ? discountValidDate.trim().slice(0, 10)
          : null,
      brandName: formCfg.showBrand ? brandName.trim() || null : null,
      colors: variantValues,
      images,
      bargainingLowAmount:
        formCfg.showBargaining && bargainingLowAmount.trim() !== ""
          ? Number.parseFloat(bargainingLowAmount)
          : null,
    };

    setSaving(true);
    try {
      const url = editingId ? `/api/products/${editingId}` : "/api/products";
      const method = editingId ? "PATCH" : "POST";
      const res = await dashboardFetch(url, {
        method,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Save failed.");
        return;
      }
      toast.success(editingId ? "Product updated." : "Product saved.");
      closeModal();
      await load();
    } catch {
      toast.error("Network error while saving.");
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (id: number) => {
    if (!confirm("Delete this product?")) return;
    try {
      const res = await dashboardFetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Delete failed.");
        return;
      }
      toast.success("Deleted.");
      if (editingId === id) closeModal();
      await load();
    } catch {
      toast.error("Network error.");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-[#f0f2f5]">
        <BallLoader size="lg" />
      </div>
    );
  }

  const variantColumnLabel =
    formCfg.variantColumnLabel || (showVariantColumn ? "Variants" : "");

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full max-h-[calc(100dvh-10.5rem)] overflow-hidden bg-[#f0f2f5]">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-black/8 bg-white">
        <div>
          <h2 className="text-sm font-bold text-[#111b21]">Your products</h2>
          <p className="text-[11px] text-[#667781] mt-0.5">{formCfg.panelHint}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="text-xs font-bold text-[#075E54] hover:underline px-2 py-1.5"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#075E54] text-white text-xs sm:text-sm font-bold hover:bg-[#054d45] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add product
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4">
        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/15 bg-white/80 p-8 text-center max-w-md mx-auto mt-8">
            <span className="material-symbols-outlined text-[#667781] text-4xl mb-3 block">
              inventory_2
            </span>
            <p className="text-sm text-[#667781] mb-4">
              No products yet. Add your first product so the AI can sell them on WhatsApp.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#075E54] text-white text-sm font-bold"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add product
            </button>
            <p className="text-[11px] text-[#667781] mt-4">
              If saving fails with “No business record”, complete{" "}
              <a href="/get-started" className="text-[#075E54] font-semibold underline">
                Get Started
              </a>{" "}
              first.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-black/8 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm text-left">
                <thead>
                  <tr className="bg-[#f0f2f5] border-b border-black/8 text-[11px] uppercase tracking-wide text-[#54656f]">
                    <th className="px-3 py-3 font-semibold w-16">Image</th>
                    <th className="px-3 py-3 font-semibold">Product</th>
                    {formCfg.showBrand ? (
                      <th className="px-3 py-3 font-semibold hidden sm:table-cell">
                        Brand
                      </th>
                    ) : null}
                    {showVariantColumn ? (
                      <th className="px-3 py-3 font-semibold">
                        {variantColumnLabel}
                      </th>
                    ) : null}
                    <th className="px-3 py-3 font-semibold text-right">Price</th>
                    <th className="px-3 py-3 font-semibold text-center w-16">Qty</th>
                    <th className="px-3 py-3 font-semibold text-right w-32">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/6">
                  {products.map((p) => {
                    const ep = effectivePrice(p);
                    const list = Number.parseFloat(p.price) || 0;
                    const showDeal =
                      p.discountEnabled && Math.abs(ep - list) > 0.009;
                    return (
                      <tr key={p.id} className="hover:bg-[#f8f9fa] transition-colors">
                        <td className="px-3 py-2.5">
                          <div className="w-12 h-12 rounded-lg bg-[#e9edef] overflow-hidden border border-black/6 relative shrink-0">
                            {p.images[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.images[0]}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#667781] text-[9px]">
                                —
                              </div>
                            )}
                            {p.images.length > 1 ? (
                              <span className="absolute bottom-0 right-0 bg-black/65 text-white text-[8px] font-bold px-0.5 rounded-tl">
                                +{p.images.length - 1}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 min-w-[120px]">
                          <p className="font-semibold text-[#111b21]">{p.productName}</p>
                          {formCfg.showBargaining &&
                          p.bargainingLowAmount != null ? (
                            <p className="text-[10px] text-[#667781] mt-0.5">
                              Floor {Number.parseFloat(p.bargainingLowAmount).toFixed(2)}
                            </p>
                          ) : null}
                        </td>
                        {formCfg.showBrand ? (
                          <td className="px-3 py-2.5 hidden sm:table-cell text-[#667781]">
                            {p.brandName || "—"}
                          </td>
                        ) : null}
                        {showVariantColumn ? (
                          <td className="px-3 py-2.5 text-[#128C7E] text-xs max-w-[140px] truncate">
                            {p.colors.length > 0 ? p.colors.join(", ") : "—"}
                          </td>
                        ) : null}
                        <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                          <span>{formatMoney(list, effectiveCurrency)}</span>
                          {showDeal && (
                            <span className="block text-[#128C7E] text-[11px] font-semibold">
                              {formatMoney(ep, effectiveCurrency)} deal
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center text-[#667781]">
                          {p.quantity}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => fillForm(p)}
                              className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-[#e9edef] text-[#111b21] hover:bg-[#dfe5e7]"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void removeProduct(p.id)}
                              className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-xl border border-black/10">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-black/8 bg-white">
              <h2 id="product-modal-title" className="text-sm font-bold text-[#111b21]">
                {editingId ? "Edit product" : "Add product"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-lg text-[#54656f] hover:bg-[#f0f2f5]"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            <div className="p-4 space-y-4">
        <p className="text-[11px] text-[#667781] rounded-lg bg-[#f0f2f5] border border-black/6 px-3 py-2">
          <span className="font-semibold text-[#075E54]">
            {formCfg.businessTypeLabel}
          </span>
          {" — "}
          {formCfg.panelHint}
        </p>

        <label className="block text-xs font-semibold text-[#54656f]">
          {formCfg.productNameLabel}
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-[#111b21] outline-none focus:ring-2 focus:ring-[#075E54]/25"
          />
        </label>

        <label className="block text-xs font-semibold text-[#54656f]">
          {formCfg.descriptionLabel}
          <textarea
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            rows={formCfg.descriptionRows}
            placeholder={formCfg.descriptionPlaceholder}
            className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-[#111b21] outline-none focus:ring-2 focus:ring-[#075E54]/25 resize-y"
          />
          {formCfg.descriptionHint ? (
            <span className="block mt-1.5 text-[11px] font-normal text-[#667781] leading-relaxed">
              {formCfg.descriptionHint}
            </span>
          ) : null}
        </label>

        {formCfg.showPriceTiers ? (
          <div className="space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer select-none rounded-xl border border-[#075E54]/20 bg-[#f0f9f6] px-3 py-3">
              <input
                type="checkbox"
                checked={useVariantPrices}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setUseVariantPrices(checked);
                  if (checked && priceTierRows.length === 0) {
                    setPriceTierRows([newPriceTierRow()]);
                  }
                }}
                className="mt-0.5 rounded border-black/20"
              />
              <span className="text-sm text-[#111b21] leading-snug">
                <span className="font-semibold block">
                  Different prices for each size or portion
                </span>
                <span className="text-[11px] font-normal text-[#667781]">
                  e.g. Full Biryani, Half Biryani — each with its own price. Hides
                  the single price field below.
                </span>
              </span>
            </label>

            {useVariantPrices ? (
              <div className="rounded-xl border border-[#075E54]/20 bg-[#f0f9f6] p-3 space-y-3">
                <p className="text-xs font-bold text-[#075E54]">
                  Prices by size / portion
                </p>
                {formCfg.variantPricesHint ? (
                  <p className="text-[11px] text-[#667781] leading-relaxed">
                    {formCfg.variantPricesHint}
                  </p>
                ) : null}
                <div className="space-y-2">
                  {priceTierRows.map((row, index) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end"
                    >
                      <label className="block text-[11px] font-semibold text-[#54656f]">
                        {index === 0 ? "Name *" : "Name"}
                        <input
                          value={row.label}
                          onChange={(e) =>
                            setPriceTierRows((prev) =>
                              prev.map((t) =>
                                t.id === row.id
                                  ? { ...t, label: e.target.value }
                                  : t
                              )
                            )
                          }
                          placeholder={
                            formCfg.formKind === "food"
                              ? "e.g. Full, Half"
                              : "e.g. Medium, Large"
                          }
                          className="mt-1 w-full rounded-lg border border-black/10 bg-white px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-[#075E54]/25"
                        />
                      </label>
                      <label className="block text-[11px] font-semibold text-[#54656f]">
                        {index === 0 ? "Price *" : "Price"}
                        <input
                          inputMode="decimal"
                          value={row.amount}
                          onChange={(e) =>
                            setPriceTierRows((prev) =>
                              prev.map((t) =>
                                t.id === row.id
                                  ? { ...t, amount: e.target.value }
                                  : t
                              )
                            )
                          }
                          placeholder={`${moneySym} 0`}
                          className="mt-1 w-full rounded-lg border border-black/10 bg-white px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-[#075E54]/25"
                        />
                      </label>
                      {priceTierRows.length > 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPriceTierRows((prev) =>
                              prev.filter((t) => t.id !== row.id)
                            )
                          }
                          className="h-9 px-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200"
                          aria-label="Remove row"
                        >
                          Remove
                        </button>
                      ) : (
                        <span className="hidden sm:block h-9" aria-hidden />
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setPriceTierRows((prev) => [...prev, newPriceTierRow()])
                  }
                  className="w-full sm:w-auto rounded-lg border border-[#075E54]/35 bg-white px-3 py-2 text-xs font-bold text-[#075E54] hover:bg-[#075E54]/5"
                >
                  + Add more
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {formCfg.showPrepTime ? (
          <label className="block text-xs font-semibold text-[#54656f]">
            Prep time (optional)
            <input
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
              placeholder="e.g. 15–20 minutes"
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#075E54]/25"
            />
          </label>
        ) : null}

        {formCfg.showAllergens ? (
          <label className="block text-xs font-semibold text-[#54656f]">
            Allergens (optional)
            <input
              value={allergens}
              onChange={(e) => setAllergens(e.target.value)}
              placeholder="e.g. Contains nuts, dairy"
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#075E54]/25"
            />
          </label>
        ) : null}

        {!(formCfg.showPriceTiers && useVariantPrices) ? (
          <label className="block text-xs font-semibold text-[#54656f]">
            Price ({effectiveCurrency}) *
            <input
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={`${moneySym} 0`}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#075E54]/25"
            />
          </label>
        ) : null}

        {formCfg.showDiscount ? (
        <div className="rounded-xl border border-black/8 bg-white/70 p-3 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={discountEnabled}
              onChange={(e) => setDiscountEnabled(e.target.checked)}
              className="rounded border-black/20"
            />
            <span className="text-sm font-semibold text-[#111b21]">Discount</span>
          </label>
          {discountEnabled && (
            <div className="space-y-3 pl-1">
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-[11px] font-semibold text-[#54656f]">
                  Type
                  <select
                    value={discountIsPercent ? "percent" : "fixed"}
                    onChange={(e) =>
                      setDiscountIsPercent(e.target.value === "percent")
                    }
                    className="mt-1 w-full rounded-lg border border-black/10 bg-white px-2 py-2 text-sm outline-none"
                  >
                    <option value="percent">Percent off</option>
                    <option value="fixed">Fixed amount off</option>
                  </select>
                </label>
                <label className="block text-[11px] font-semibold text-[#54656f]">
                  Value
                  <input
                    inputMode="decimal"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountIsPercent ? "e.g. 10" : "e.g. 5.00"}
                    className="mt-1 w-full rounded-lg border border-black/10 bg-white px-2 py-2 text-sm outline-none"
                  />
                </label>
              </div>
              <label className="block text-[11px] font-semibold text-[#54656f]">
                Discount available on (date)
                <input
                  type="date"
                  value={discountValidDate}
                  onChange={(e) => setDiscountValidDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-black/10 bg-white px-2 py-2 text-sm outline-none"
                />
              </label>
              <p className="text-[11px] text-[#667781]">
                If you pick a date, the discount applies only on that day. Leave
                empty to apply whenever discount is enabled.
              </p>
            </div>
          )}
        </div>
        ) : null}

        {formCfg.showBrand ? (
          <label className="block text-xs font-semibold text-[#54656f]">
            Brand (optional)
            <input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none"
            />
          </label>
        ) : null}

        {formCfg.showSizes ? (
          <label className="block text-xs font-semibold text-[#54656f]">
            {formCfg.sizesLabel}
            <input
              value={sizesText}
              onChange={(e) => setSizesText(e.target.value)}
              placeholder={formCfg.sizesPlaceholder}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none"
            />
            <span className="block mt-1 text-[11px] font-normal text-[#667781]">
              Comma-separated sizes buyers can choose (e.g. S, M, L).
            </span>
          </label>
        ) : null}

        {formCfg.showColors ? (
          <label className="block text-xs font-semibold text-[#54656f]">
            {formCfg.colorsLabel}
            <input
              value={colorsText}
              onChange={(e) => setColorsText(e.target.value)}
              placeholder={formCfg.colorsPlaceholder}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none"
            />
          </label>
        ) : null}

        {formCfg.showPortions ? (
          <label className="block text-xs font-semibold text-[#54656f]">
            {formCfg.portionsLabel}
            <input
              value={portionsText}
              onChange={(e) => setPortionsText(e.target.value)}
              placeholder={formCfg.portionsPlaceholder}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none"
            />
          </label>
        ) : null}

        {formCfg.showImages ? (
          <>
        <label className="block text-xs font-semibold text-[#54656f]">
          {formCfg.formKind === "food"
            ? "Menu photos (JPG / PNG)"
            : formCfg.formKind === "booking"
              ? "Service photos (JPG / PNG)"
              : "Product images (JPG / PNG)"}
          <input
            type="file"
            accept="image/jpeg,image/png,.jpg,.jpeg,.png"
            multiple
            onChange={(e) => void onPickImages(e.target.files)}
            className="mt-1 block w-full text-xs text-[#54656f] file:mr-2 file:rounded-lg file:border-0 file:bg-[#075E54] file:px-3 file:py-1.5 file:text-white file:text-xs"
          />
          <span className="block mt-1 text-[11px] font-normal text-[#667781]">
            JPG or PNG only (max {MAX_PRODUCT_IMAGES} per product, each under 3 MB).
            Images are stored as base64 in the database.
          </span>
        </label>
        {images.length > 0 && (
          <p className="text-[11px] text-[#54656f] font-semibold">
            {images.length} / {MAX_PRODUCT_IMAGES} images
          </p>
        )}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((src, i) => (
              <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-black/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImages(images.filter((_, j) => j !== i))}
                  className="absolute top-0 right-0 bg-black/60 text-white text-[10px] px-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
          </>
        ) : null}

        {formCfg.showBargaining ? (
          <>
            <label className="block text-xs font-semibold text-[#54656f]">
              Bargaining: lowest price you will accept (optional)
              <input
                inputMode="decimal"
                value={bargainingLowAmount}
                onChange={(e) => setBargainingLowAmount(e.target.value)}
                placeholder="e.g. 45 when list price is 50"
                className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none"
              />
            </label>
            <p className="text-[11px] text-[#667781] -mt-2">
              Floor price during negotiations; list price stays the same.
            </p>
          </>
        ) : null}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-lg border border-black/10 text-sm font-semibold text-[#54656f] hover:bg-[#f0f2f5]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void submit()}
                  className="flex-1 py-2.5 rounded-lg bg-[#075E54] text-white text-sm font-bold hover:bg-[#054d45] disabled:opacity-50 transition-colors"
                >
                  {saving ? "Saving…" : editingId ? "Update" : "Save product"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
