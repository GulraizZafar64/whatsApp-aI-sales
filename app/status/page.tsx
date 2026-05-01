export default function StatusPage() {
  return (
    <main className="pt-32 pb-16 px-6 max-w-7xl mx-auto">
      <h1 className="text-display-lg mb-8">System Status</h1>
      <div className="flex items-center gap-4 p-6 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
        <span className="font-semibold">All systems operational</span>
      </div>
    </main>
  );
}
