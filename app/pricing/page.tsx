import Link from "next/link";
import { PricingPlansGrid } from "@/components/pricing/PricingPlansGrid";

export default function PricingPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="pt-12 pb-16 text-center px-6">
        <div className="max-w-3xl mx-auto">
          <span className="bg-primary-container/20 text-on-primary-container px-4 py-1 rounded-full text-label-sm font-bold mb-6 inline-block">Simple, Transparent Pricing</span>
          <h1 className="text-display-xl tracking-tight text-on-surface mb-6">Start small, scale as your business grows</h1>
          <p className="text-body-lg text-secondary max-w-xl mx-auto">
            No hidden fees. Cancel anytime. Choose the plan that fits your current needs and upgrade whenever you&apos;re ready.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-container-max mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <PricingPlansGrid />
      </section>

      {/* Comparison Table */}
      <section className="max-w-container-max mx-auto px-6 py-24 border-t border-gray-100">
        <div className="text-center mb-16">
          <h2 className="text-headline-md mb-4">Compare Features</h2>
          <p className="text-secondary text-body-md">Find the perfect match for your business requirements.</p>
        </div>
        <div className="overflow-x-auto pb-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-6 px-4 text-label-md text-secondary font-medium">Feature</th>
                <th className="py-6 px-4 text-label-md text-on-surface text-center font-medium">Starter</th>
                <th className="py-6 px-4 text-label-md text-on-surface text-center bg-gray-50/50 rounded-t-xl font-medium">Pro</th>
                <th className="py-6 px-4 text-label-md text-on-surface text-center font-medium">Enterprise</th>
              </tr>
            </thead>
            <tbody className="text-body-md">
              <tr className="border-b border-gray-100 hover:bg-gray-50/30 transition-colors">
                <td className="py-5 px-4 font-medium">AI replies</td>
                <td className="py-5 px-4 text-center text-secondary">Basic Templates</td>
                <td className="py-5 px-4 text-center font-semibold text-primary bg-gray-50/50">Smart Learning AI</td>
                <td className="py-5 px-4 text-center text-secondary">Advanced NLP</td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50/30 transition-colors">
                <td className="py-5 px-4 font-medium">Message limits</td>
                <td className="py-5 px-4 text-center text-secondary">500 / mo</td>
                <td className="py-5 px-4 text-center font-semibold text-on-surface bg-gray-50/50">2,000 / mo</td>
                <td className="py-5 px-4 text-center text-secondary">Unlimited</td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50/30 transition-colors">
                <td className="py-5 px-4 font-medium">Order automation</td>
                <td className="py-5 px-4 text-center">
                  <span className="material-symbols-outlined text-gray-300">close</span>
                </td>
                <td className="py-5 px-4 text-center bg-gray-50/50">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    done
                  </span>
                </td>
                <td className="py-5 px-4 text-center">
                  <span className="material-symbols-outlined text-primary">done</span>
                </td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50/30 transition-colors">
                <td className="py-5 px-4 font-medium">Support level</td>
                <td className="py-5 px-4 text-center text-secondary">Basic support</td>
                <td className="py-5 px-4 text-center font-semibold text-on-surface bg-gray-50/50">Basic support</td>
                <td className="py-5 px-4 text-center text-secondary">Personal + developer help</td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50/30 transition-colors">
                <td className="py-5 px-4 font-medium">Custom features</td>
                <td className="py-5 px-4 text-center">
                  <span className="material-symbols-outlined text-gray-300">close</span>
                </td>
                <td className="py-5 px-4 text-center bg-gray-50/50">
                  <span className="material-symbols-outlined text-gray-300">close</span>
                </td>
                <td className="py-5 px-4 text-center">
                  <span className="material-symbols-outlined text-primary">done</span>
                </td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50/30 transition-colors">
                <td className="py-5 px-4 font-medium">Multi-user support</td>
                <td className="py-5 px-4 text-center">
                  <span className="material-symbols-outlined text-gray-300">close</span>
                </td>
                <td className="py-5 px-4 text-center bg-gray-50/50">
                  <span className="material-symbols-outlined text-gray-300">close</span>
                </td>
                <td className="py-5 px-4 text-center">
                  <span className="material-symbols-outlined text-primary">done</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Trust Section */}
      <section className="bg-gray-50/50 py-24">
        <div className="max-w-container-max mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-headline-md mb-2">Trusted by growing businesses</h2>
            <p className="text-secondary text-body-md">See why 10,000+ teams use SalesAI every day.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="material-symbols-outlined text-primary-container text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                    star
                  </span>
                ))}
              </div>
              <p className="text-on-surface italic text-body-md mb-6">
                &quot;SalesAI completely transformed our customer service. We&apos;ve seen a 40% increase in conversions since automating our product catalog on WhatsApp.&quot;
              </p>
              <div className="flex items-center gap-4">
                <img
                  className="w-10 h-10 rounded-full object-cover bg-gray-200"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD1ddExIvEt4GbWm0xMFGgbFCv3sg9VkjkQSB18W3YtZcX4xHPropOFmhmqfDV-SiLuNJm_hIjMmUazhF0x86pW6I75HBUAhGgseODUfC2KKH2eCl_cToGRamAY-2-NqMEKtOMF-Kw7zZfbHowA_NCxQqOP9_aFGJTqqGSFdQsS8V6h40e0cm5eFR3hsqqbHHU-Dj51M0kZ9XpJQbC_V8_i23lC2ijnKvrgtrswiFtA8Y5gfcn6dTx7dyx73gBw4tpqr-VpOQ6WP36o"
                  alt="Sarah Jenkins"
                />
                <div>
                  <p className="text-label-md text-on-surface font-medium">Sarah Jenkins</p>
                  <p className="text-secondary text-label-sm">CEO, Bloom Retail</p>
                </div>
              </div>
            </div>
            {/* Testimonial 2 */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="material-symbols-outlined text-primary-container text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                    star
                  </span>
                ))}
              </div>
              <p className="text-on-surface italic text-body-md mb-6">
                &quot;The Pro plan is incredible. It handles complex order questions automatically while I sleep. The integration was seamless and very fast.&quot;
              </p>
              <div className="flex items-center gap-4">
                <img
                  className="w-10 h-10 rounded-full object-cover bg-gray-200"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVNWsHXNBGtlo1dhj9lrDpPf4LjioG347gFTTUso7q9pE2bvP8IhIDpjLqJF98cCYbN7ROFvpuGzXRViFw287RDRa4k1Ibxv2oYq3kG_w1vnd12VrwY6UpheDjdeRxWE4Cu7zTtCU2MqV1oo7unl-e1AfB_YKPXt-sVBwzzO83hAi1jCTZ7pQHYH2GSWWeGQGn3TJ7hpt-sCHUW_HKVP4MulqQg-nPlNwDKf-lUgyU9WqerLynwS_rrD10lXVvopZZUDVk5U8DW1w6"
                  alt="Mark Thompson"
                />
                <div>
                  <p className="text-label-md text-on-surface font-medium">Mark Thompson</p>
                  <p className="text-secondary text-label-sm">Operations Lead, TechSync</p>
                </div>
              </div>
            </div>
            {/* Testimonial 3 */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="material-symbols-outlined text-primary-container text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                    star
                  </span>
                ))}
              </div>
              <p className="text-on-surface italic text-body-md mb-6">
                &quot;Unlimited AI conversations for our whole team. It&apos;s the most transparent pricing we&apos;ve found in the market. Highly recommended for scaling teams.&quot;
              </p>
              <div className="flex items-center gap-4">
                <img
                  className="w-10 h-10 rounded-full object-cover bg-gray-200"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7cLtFVrtc_IVCb4F29pnFkV-Sd1QlYoL5frUYRnb-IJK0JvezbGmXyFF5ApWxnKi_ECX9c1AioSWoVVp6aCX2UdTyHIV9-RAgQxYomT7k6T6dqFXYfQq1CrYr0FWXZvwx5DkrwCIUy_QCEETD6Q9uSGfvpML_QrokDBA5q-Jm6CFBYZbeiaQciOpdct2swqORmqc6lJK1wkC53HKp4LaWo8tIyKnLqNPJz30TnSsSELIOvFxMbP40sdGX_YhEJrGfImDxFkOrYj_1"
                  alt="Jessica Chen"
                />
                <div>
                  <p className="text-label-md text-on-surface font-medium">Jessica Chen</p>
                  <p className="text-secondary text-label-sm">Founder, Trendify</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-3xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-headline-md mb-4">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-6">
          <div className="border-b border-gray-100 pb-6">
            <h3 className="text-label-md text-on-surface mb-2 font-medium">Do I need technical skills?</h3>
            <p className="text-body-md text-on-surface-variant">No, SalesAI is designed for everyone. You can set up your AI assistant in minutes with our intuitive dashboard, no coding required.</p>
          </div>
          <div className="border-b border-gray-100 pb-6">
            <h3 className="text-label-md text-on-surface mb-2 font-medium">How is Enterprise pricing set?</h3>
            <p className="text-body-md text-on-surface-variant">
              Enterprise is tailored to your business. Contact our team and we will share custom pricing, features, and API access details.
            </p>
          </div>
          <div className="border-b border-gray-100 pb-6">
            <h3 className="text-label-md text-on-surface mb-2 font-medium">What happens if I exceed message limits?</h3>
            <p className="text-body-md text-on-surface-variant">
              We&apos;ll notify you when you reach 80% and 100% of your limit. You can easily upgrade to the next tier or purchase add-on credits from your dashboard.
            </p>
          </div>
          <div className="border-b border-gray-100 pb-6">
            <h3 className="text-label-md text-on-surface mb-2 font-medium">Can I cancel anytime?</h3>
            <p className="text-body-md text-on-surface-variant">Yes, our plans are month-to-month. You can cancel or change your plan at any time through your billing settings without any hidden fees.</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-container-max mx-auto px-6 mb-24">
        <div className="bg-primary rounded-2xl p-12 text-center text-on-primary shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/20 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-container/10 rounded-full -ml-16 -mb-16 blur-2xl"></div>
          <div className="relative z-10">
            <h2 className="text-display-lg mb-4">Start Automating Your WhatsApp Today</h2>
            <p className="text-on-primary/80 text-body-lg max-w-xl mx-auto mb-10">Turn conversations into customers with the world&apos;s most intelligent AI sales assistant.</p>
            <Link
              href="/get-started"
              className="inline-block bg-white text-primary text-label-md px-10 py-4 rounded-lg shadow-lg hover:bg-gray-50 active:scale-95 transition-all font-bold"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
