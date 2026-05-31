import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 w-full py-12">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center px-8 gap-6">
        <div className="space-y-4">
          <div className="text-lg font-bold text-gray-800 dark:text-gray-200">WhatsApp AI Sales</div>
          <p className="font-['Inter'] text-xs text-gray-500 dark:text-gray-400 max-w-[300px]">
            © 2026 WhatsApp AI Sales. Built for high-velocity sales. Empowering modern enterprises with intelligent
            automation.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          <Link
            className="font-['Inter'] text-xs text-gray-500 dark:text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 underline-offset-4 hover:underline"
            href="/privacy"
          >
            Privacy Policy
          </Link>
          <Link
            className="font-['Inter'] text-xs text-gray-500 dark:text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 underline-offset-4 hover:underline"
            href="/terms"
          >
            Terms of Service
          </Link>
          <Link
            className="font-['Inter'] text-xs text-gray-500 dark:text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 underline-offset-4 hover:underline"
            href="/contact-us"
          >
            Contact Support
          </Link>
          <Link
            className="font-['Inter'] text-xs text-gray-500 dark:text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 underline-offset-4 hover:underline"
            href="/docs"
          >
            API Documentation
          </Link>
        </div>
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-500">
            <span className="material-symbols-outlined text-[18px]">language</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-500">
            <span className="material-symbols-outlined text-[18px]">public</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
