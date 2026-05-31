"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { createProductFormConfig } from "@/lib/product-form-config";
import {
  isAllowedProductImageFile,
  normalizeProductImageDataUrl,
} from "@/lib/product-image";
import {
  MAX_IMAGE_DECODED_BYTES,
  MAX_PRODUCT_IMAGES,
} from "@/lib/product-payload";
import { COMPLETED_ORDERS_CHANGED_EVENT } from "@/lib/dashboard-events";
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
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

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
  const [images, setImages] = useState<string[]>([]);

  const formCfg = useMemo(
    () => createProductFormConfig(businessType),
    [businessType]
  );

  const resetForm = useCallback(() => {
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
    setImages([]);
  }, []);

  const load = useCallback(async () => {
    const phoneNumberId = localStorage.getItem("whatsappPhoneNumberId")?.trim();
    if (!phoneNumberId) {
      setLoading(false);
      toast.error("Missing phone number ID. Sign in again after connecting WhatsApp.");
      return;
    }
    setLoading(true);
    try {
      const res = await dashboardFetch("/api/products", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err =
          typeof data.error === "string" ? data.error : "Could not load products.";
        toast.error(err);
        setProducts([]);
        return;
      }
      setProducts((data as { products?: ProductRow[] }).products ?? []);
      const bt = (data as { businessType?: string | null }).businessType;
      setBusinessType(typeof bt === "string" && bt.trim() ? bt.trim() : null);
    } catch {
      toast.error("Network error loading products.");
    } finally {
      setLoading(false);
    }
  }, []);

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

  function buildProductDescription(base: string): string | null {
    const parts: string[] = [];
    if (base.trim()) parts.push(base.trim());
    if (formCfg.showPrepTime && prepTime.trim()) {
      parts.push(`Prep time: ${prepTime.trim()}`);
    }
    if (formCfg.showAllergens && allergens.trim()) {
      parts.push(`Allergens: ${allergens.trim()}`);
    }
    return parts.length ? parts.join("\n") : null;
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
    setEditingId(p.id);
    setProductName(p.productName);
    setPrice(p.price);
    setQuantity(String(p.quantity));
    setSubtractOnOrder(p.subtractOnOrder);
    setDiscountEnabled(p.discountEnabled);
    setDiscountValue(p.discountValue ?? "");
    setDiscountIsPercent(p.discountIsPercent);
    setDiscountValidDate(p.discountValidDate ?? "");
    setBrandName(p.brandName ?? "");
    setColorsText("");
    setSizesText("");
    setPortionsText("");
    if (formCfg.showPortions) {
      setPortionsText(p.colors.length ? p.colors.join(", ") : "");
    } else if (formCfg.showSizes) {
      setSizesText(p.colors.length ? p.colors.join(", ") : "");
      setColorsText("");
    } else if (formCfg.showColors) {
      setColorsText(p.colors.length ? p.colors.join(", ") : "");
    } else {
      setColorsText(p.colors.length ? p.colors.join(", ") : "");
    }
    const foodBits = parseFoodExtrasFromDescription(p.productDescription);
    setProductDescription(foodBits.base);
    setPrepTime(foodBits.prep);
    setAllergens(foodBits.allergen);
    setBargainingLowAmount(p.bargainingLowAmount ?? "");
    setImages([...p.images]);
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
    const phoneNumberId = localStorage.getItem("whatsappPhoneNumberId")?.trim();
    if (!phoneNumberId) {
      toast.error("Missing phone number ID.");
      return;
    }
    if (!productName.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (formCfg.sizesRequired && sizesArray.length === 0) {
      toast.error("Add at least one size (comma-separated).");
      return;
    }
    if (formCfg.colorsRequired && colorsArray.length === 0) {
      toast.error("Add at least one color or variant.");
      return;
    }
    const pNum = Number.parseFloat(price);
    if (!Number.isFinite(pNum) || pNum < 0) {
      toast.error("Enter a valid price.");
      return;
    }

    const payload = {
      productName: productName.trim(),
      productDescription: buildProductDescription(productDescription),
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
      resetForm();
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
      if (editingId === id) resetForm();
      await load();
    } catch {
      toast.error("Network error.");
    }
  };

  const recordSale = async (id: number) => {
    try {
      const res = await dashboardFetch(`/api/products/${id}/sale`, {
        method: "POST",
        cache: "no-store",
        body: JSON.stringify({ qty: 1 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Could not record sale.");
        return;
      }
      toast.success("Sale recorded.");
      window.dispatchEvent(new Event(COMPLETED_ORDERS_CHANGED_EVENT));
      await load();
    } catch {
      toast.error("Network error.");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-[#f0f2f5]">
        <div className="animate-spin h-10 w-10 border-4 border-[#075E54] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-y-auto lg:overflow-hidden bg-[#f0f2f5] overscroll-y-contain">
      <div className="lg:w-[min(440px,100%)] lg:shrink-0 border-b lg:border-b-0 lg:border-r border-black/8 lg:overflow-y-auto lg:max-h-full p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[#111b21]">
            {editingId ? "Edit product" : "New product"}
          </h2>
          {editingId != null && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-semibold text-[#075E54] hover:underline"
            >
              Cancel edit
            </button>
          )}
        </div>

        <p className="text-[11px] text-[#667781] rounded-lg bg-white/80 border border-black/6 px-3 py-2">
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
            rows={3}
            placeholder={formCfg.descriptionPlaceholder}
            className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-[#111b21] outline-none focus:ring-2 focus:ring-[#075E54]/25 resize-y"
          />
        </label>

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

        <label className="block text-xs font-semibold text-[#54656f]">
          Price *
          <input
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#075E54]/25"
          />
        </label>

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
          Product images (JPG / PNG)
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

        <button
          type="button"
          disabled={saving}
          onClick={() => void submit()}
          className="w-full py-2.5 rounded-lg bg-[#075E54] text-white text-sm font-bold hover:bg-[#054d45] disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : editingId ? "Update product" : "Save product"}
        </button>
      </div>

      <div className="p-4 lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-bold text-[#111b21]">Your products</h3>
          <button
            type="button"
            onClick={() => void load()}
            className="text-xs font-bold text-[#075E54] hover:underline"
          >
            Refresh
          </button>
        </div>
        {products.length === 0 ? (
          <p className="text-sm text-[#667781]">
            No products yet. Add one on the left. If saving fails with “No business
            record”, complete{" "}
            <a href="/get-started" className="text-[#075E54] font-semibold underline">
              Get Started
            </a>{" "}
            for this WhatsApp number first.
          </p>
        ) : (
          <ul className="space-y-3">
            {products.map((p) => {
              const ep = effectivePrice(p);
              const list = Number.parseFloat(p.price) || 0;
              const showDeal = p.discountEnabled && Math.abs(ep - list) > 0.009;
              return (
                <li
                  key={p.id}
                  className="rounded-xl border border-black/8 bg-white p-3 shadow-sm flex gap-3"
                >
                  <div className="w-20 h-20 shrink-0 rounded-lg bg-[#e9edef] overflow-hidden border border-black/6 relative">
                    {p.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.images[0]}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#667781] text-xs">
                        No image
                      </div>
                    )}
                    {p.images.length > 1 ? (
                      <span className="absolute bottom-0 right-0 bg-black/65 text-white text-[9px] font-bold px-1 rounded-tl">
                        +{p.images.length - 1}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#111b21] truncate">
                      {p.productName}
                    </p>
                    {p.brandName && (
                      <p className="text-[11px] text-[#667781] truncate">{p.brandName}</p>
                    )}
                    {p.colors.length > 0 && (
                      <p className="text-[11px] text-[#128C7E] mt-0.5 truncate">
                        Colors: {p.colors.join(", ")}
                      </p>
                    )}
                    <p className="text-sm text-[#111b21] mt-1">
                      <span className="font-mono">{list.toFixed(2)}</span>
                      {showDeal && (
                        <span className="text-[#128C7E] font-semibold ml-2">
                          → {ep.toFixed(2)} today
                        </span>
                      )}
                      <span className="text-[#667781] ml-2">Qty {p.quantity}</span>
                    </p>
                    {p.bargainingLowAmount != null && (
                      <p className="text-[11px] text-[#667781] mt-0.5">
                        Bargain floor:{" "}
                        <span className="font-mono">
                          {Number.parseFloat(p.bargainingLowAmount).toFixed(2)}
                        </span>
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => fillForm(p)}
                        className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#e9edef] text-[#111b21] hover:bg-[#dfe5e7]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeProduct(p.id)}
                        className="text-xs font-bold px-3 py-1.5 rounded-full bg-red-50 text-red-700 hover:bg-red-100"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        disabled={p.subtractOnOrder && p.quantity <= 0}
                        onClick={() => void recordSale(p.id)}
                        className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#dcf8c6] text-[#111b21] hover:bg-[#c8edb5] disabled:opacity-40 disabled:cursor-not-allowed"
                        title={
                          p.subtractOnOrder && p.quantity <= 0
                            ? "No stock left to sell with inventory tracking on."
                            : p.subtractOnOrder
                              ? "Logs a completed order and reduces quantity by 1."
                              : "Logs a completed order (inventory tracking is off for this product)."
                        }
                      >
                        Mark order done
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
