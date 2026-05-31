import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardProvider } from "@/components/dashboard/DashboardProvider";

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </DashboardProvider>
  );
}
