"use client";

type Point = { date: string; aiReplies: number; contacts: number };

export function UsageBarChart({
  data,
  aiLimit,
}: {
  data: Point[];
  aiLimit?: number | null;
}) {
  if (!data.length) {
    return (
      <p className="text-sm text-[#667781] p-4">No usage data for this period yet.</p>
    );
  }

  const maxAi = Math.max(
    1,
    ...data.map((d) => d.aiReplies),
    aiLimit ?? 0
  );

  return (
    <div className="p-4">
      <div className="flex items-end gap-1 h-36">
        {data.map((d) => {
          const h = Math.round((d.aiReplies / maxAi) * 100);
          return (
            <div
              key={d.date}
              className="flex-1 min-w-0 flex flex-col items-center justify-end gap-1 group"
              title={`${d.date}: ${d.aiReplies} AI replies, ${d.contacts} contacts`}
            >
              <div
                className="w-full max-w-[14px] rounded-t bg-[#25D366] transition-all group-hover:bg-[#128C7E]"
                style={{ height: `${Math.max(h, d.aiReplies > 0 ? 8 : 2)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-[#667781]">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
      <p className="text-[10px] text-[#667781] mt-2 text-center">
        Daily AI replies (last 30 days)
      </p>
    </div>
  );
}
