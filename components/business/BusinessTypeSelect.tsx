"use client";

import {
  BUSINESS_TYPES,
  TYPE_PLACEHOLDER,
  getBusinessTypeDescription,
  isUnsetBusinessType,
} from "@/lib/business-type";

type Props = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  required?: boolean;
};

export function BusinessTypeSelect({
  value,
  onChange,
  id,
  className = "w-full rounded-lg border border-black/10 bg-[#f8f9fa] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#075E54]/25",
  required = false,
}: Props) {
  const description = getBusinessTypeDescription(value);

  return (
    <div className="space-y-2">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        required={required}
      >
        <option disabled value={TYPE_PLACEHOLDER}>
          {TYPE_PLACEHOLDER}
        </option>
        {BUSINESS_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      {description && !isUnsetBusinessType(value) && (
        <p className="text-body-sm text-secondary leading-snug">{description}</p>
      )}
    </div>
  );
}
