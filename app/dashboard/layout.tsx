import { Suspense } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardProvider } from "@/components/dashboard/DashboardProvider";
import { BallLoader } from "@/components/ui/BallLoader";

function DashboardBootstrapFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center bg-[#d9dbd5]">
      <BallLoader size="md" />
    </div>
  );
}

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<DashboardBootstrapFallback />}>
      <DashboardProvider>
        <DashboardLayout>{children}</DashboardLayout>
      </DashboardProvider>
    </Suspense>
  );
}
