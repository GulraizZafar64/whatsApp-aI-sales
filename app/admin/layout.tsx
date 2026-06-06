import type { ReactNode } from "react";

/** Admin routes use a minimal layout (no marketing chrome). */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
