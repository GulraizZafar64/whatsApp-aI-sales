"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CountryFlag } from "@/components/business/CountryFlag";
import {
  getCountryOptions,
  getCountryPlaceholder,
  type CountryOption,
} from "@/lib/countries";

type Props = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  required?: boolean;
};

const LIST_MAX_HEIGHT_PX = 280;

export function CountrySelect({
  value,
  onChange,
  id,
  className = "",
  triggerClassName,
  disabled = false,
  required = false,
}: Props) {
  const options = useMemo(() => getCountryOptions(), []);
  const placeholder = getCountryPlaceholder();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelRect, setPanelRect] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const selected = useMemo(
    () => options.find((c) => c.name === value) ?? null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [options, query]);

  const updatePanelPosition = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 4;
    const viewportPadding = 12;
    const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPadding;
    const spaceAbove = rect.top - gap - viewportPadding;
    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(
      LIST_MAX_HEIGHT_PX + 52,
      Math.max(160, openUp ? spaceAbove : spaceBelow)
    );
    const listHeight = Math.min(LIST_MAX_HEIGHT_PX, maxHeight - 52);

    setPanelRect({
      left: rect.left,
      width: rect.width,
      maxHeight: listHeight + 52,
      top: openUp
        ? rect.top - gap - (listHeight + 52)
        : rect.bottom + gap,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePanelPosition();
    const onReposition = () => updatePanelPosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
      setQuery("");
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pick = (c: CountryOption) => {
    onChange(c.name);
    setOpen(false);
    setQuery("");
  };

  const triggerLabel = selected ? selected.name : placeholder;

  const defaultTriggerClass =
    "w-full flex items-center gap-2 rounded-lg border border-black/10 bg-[#f8f9fa] px-3 py-2.5 text-sm text-left outline-none focus:ring-2 focus:ring-[#075E54]/25 disabled:opacity-50";

  const panel =
    open && panelRect && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            data-country-select-panel
            className="fixed z-[9999] rounded-xl border border-black/10 bg-white shadow-2xl flex flex-col overflow-hidden"
            style={{
              top: panelRect.top,
              left: panelRect.left,
              width: panelRect.width,
              maxHeight: panelRect.maxHeight,
            }}
          >
            <div className="shrink-0 p-2 border-b border-black/8">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country…"
                autoFocus
                className="w-full rounded-lg border border-black/10 bg-[#f8f9fa] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#075E54]/25"
              />
            </div>
            <ul
              role="listbox"
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
              style={{ maxHeight: panelRect.maxHeight - 52 }}
              aria-label="Countries"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-4 text-sm text-[#667781] text-center">
                  No countries match your search.
                </li>
              ) : (
                filtered.map((c) => {
                  const active = selected?.code === c.code;
                  return (
                    <li key={c.code} role="option" aria-selected={active}>
                      <button
                        type="button"
                        onClick={() => pick(c)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-[#f0f2f5] ${
                          active
                            ? "bg-[#e7f4ef] text-[#075E54] font-semibold"
                            : "text-[#111b21]"
                        }`}
                      >
                        <CountryFlag code={c.code} />
                        <span className="truncate">{c.name}</span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {required && (
        <input
          type="text"
          tabIndex={-1}
          aria-hidden
          value={selected ? selected.name : ""}
          required
          className="absolute opacity-0 pointer-events-none h-0 w-0"
          onChange={() => {}}
        />
      )}

      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (disabled) return;
          setOpen((o) => {
            const next = !o;
            if (next) updatePanelPosition();
            else setQuery("");
            return next;
          });
        }}
        className={triggerClassName ?? defaultTriggerClass}
      >
        {selected ? (
          <CountryFlag code={selected.code} />
        ) : (
          <span className="w-6 h-4 shrink-0" aria-hidden />
        )}
        <span
          className={`flex-1 truncate ${!selected ? "text-[#667781]" : "text-[#111b21]"}`}
        >
          {triggerLabel}
        </span>
        <span className="material-symbols-outlined text-[#667781] text-lg shrink-0">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {panel}
    </div>
  );
}
