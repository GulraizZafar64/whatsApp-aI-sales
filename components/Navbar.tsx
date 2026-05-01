import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md  shadow-sm">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-8 py-4">
        <Link
          href="/"
          className="text-xl font-bold text-gray-900 tracking-tighter"
        >
          WhatsApp AI Sales
        </Link>
        <div className="hidden md:flex gap-8 items-center">
          <Link
            className="font-['Inter'] text-sm font-semibold tracking-tight text-emerald-600 border-b-2 border-emerald-500 pb-1"
            href="/features"
          >
            Features
          </Link>
          <Link
            className="font-['Inter'] text-sm font-medium tracking-tight text-gray-600 hover:text-emerald-500 transition-colors duration-200"
            href="/how-it-works"
          >
            How it Works
          </Link>
          <Link
            className="font-['Inter'] text-sm font-medium tracking-tight text-gray-600 hover:text-emerald-500 transition-colors duration-200"
            href="/pricing"
          >
            Pricing
          </Link>
          <Link
            className="font-['Inter'] text-sm font-medium tracking-tight text-gray-600  hover:text-emerald-500 transition-colors duration-200"
            href="/demo"
          >
            Demo
          </Link>
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/sign-in">
            <button className="text-sm font-medium text-gray-600 hover:text-emerald-500 transition-all">
              Login
            </button>
          </Link>
          <Link href="/get-started">
            <button className="bg-primary hover:bg-on-primary-container text-white px-5 py-2.5 rounded-xl font-semibold text-sm active:scale-95 transition-all shadow-sm">
              Get Started
            </button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
