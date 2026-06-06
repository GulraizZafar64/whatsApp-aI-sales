import { BallLoader } from "@/components/ui/BallLoader";

export default function DashboardLoading() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[200px]">
      <BallLoader size="md" />
    </div>
  );
}
