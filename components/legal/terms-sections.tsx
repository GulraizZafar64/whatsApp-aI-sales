import Link from "next/link";
import type { LegalSection } from "@/components/legal/LegalPageShell";
import { APP_NAME, OPERATOR_NAME } from "@/lib/legal-site";

export const termsSections: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement to these terms",
    content: (
      <>
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of the {APP_NAME} web
          application, dashboard, APIs, and related services (collectively, the &quot;Service&quot;) operated by{" "}
          {OPERATOR_NAME} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
        </p>
        <p>
          By creating an account, connecting a WhatsApp Business account through Meta, or otherwise using the
          Service, you agree to these Terms and to our{" "}
          <Link href="/privacy">Privacy Policy</Link>. If you do not agree, do not use the Service.
        </p>
      </>
    ),
  },
  {
    id: "service",
    title: "What the Service does",
    content: (
      <>
        <p>{APP_NAME} helps businesses sell through WhatsApp by providing:</p>
        <ul>
          <li>
            <strong>WhatsApp inbox</strong> — view and manage customer conversations linked to your connected
            business phone number.
          </li>
          <li>
            <strong>AI-assisted replies</strong> — automated responses powered by Anthropic Claude, using your
            product catalog, pricing rules, and custom AI instructions (including reply tone).
          </li>
          <li>
            <strong>Product catalog</strong> — create and manage products (including images, discounts, and
            optional bargaining floors) stored in your business account.
          </li>
          <li>
            <strong>Orders</strong> — manual order creation and orders placed when customers provide delivery
            details in chat (including AI-detected order intent).
          </li>
          <li>
            <strong>Activity log</strong> — record of notable events in your account.
          </li>
          <li>
            <strong>Blacklist</strong> — block specific WhatsApp contacts from automated handling.
          </li>
          <li>
            <strong>Follow-up messages</strong> — optional automated WhatsApp messages sent after a period of
            customer inactivity (e.g. a reminder with a bargain price), when configured.
          </li>
        </ul>
        <p>
          The Service integrates with <strong>Meta&apos;s WhatsApp Business Platform</strong> (Cloud API). Message
          delivery, rate limits, and account status depend on Meta and your WhatsApp Business configuration.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Eligibility and registration",
    content: (
      <>
        <p>
          You must be at least 18 years old and authorized to bind the business you represent. You must have a
          valid WhatsApp Business account eligible for the Meta APIs we use.
        </p>
        <p>During onboarding you provide:</p>
        <ul>
          <li>
            Business name, business type (e.g. Product-Based E-commerce, Service-Based Booking,
            Lead Generation), and country.
          </li>
          <li>
            Connection via <strong>Meta login</strong> — we receive your WhatsApp <strong>phone number ID</strong>,{" "}
            <strong>business account ID</strong>, and display number from Meta; you do not manually enter your
            WhatsApp number in our form.
          </li>
        </ul>
        <p>
          You are responsible for keeping your Meta authorization current and for all activity under your
          dashboard session (including tokens stored in your browser&apos;s local storage after sign-in).
        </p>
      </>
    ),
  },
  {
    id: "whatsapp-meta",
    title: "WhatsApp, Meta, and third-party terms",
    content: (
      <>
        <p>
          Your use of WhatsApp messaging is subject to Meta&apos;s terms and policies, including the{" "}
          <a href="https://www.whatsapp.com/legal/business-terms" target="_blank" rel="noopener noreferrer">
            WhatsApp Business Terms of Service
          </a>
          ,{" "}
          <a href="https://www.whatsapp.com/legal/business-policy" target="_blank" rel="noopener noreferrer">
            WhatsApp Business Messaging Policy
          </a>
          , and applicable Meta Platform Terms. You must obtain and maintain all required customer consents before
          messaging users on WhatsApp.
        </p>
        <p>
          We are not Meta or WhatsApp. We do not control Meta&apos;s APIs, outages, policy enforcement, or account
          bans. You agree not to use the Service for spam, harassment, illegal goods, or any purpose prohibited by
          Meta or applicable law.
        </p>
      </>
    ),
  },
  {
    id: "ai",
    title: "AI-generated content and your responsibilities",
    content: (
      <>
        <p>
          Automated replies are generated by AI (Anthropic Claude) based on your catalog, instructions, and message
          context. <strong>AI output may be inaccurate, incomplete, or inappropriate.</strong> You must review
          critical communications (pricing, legal claims, medical or financial advice, etc.) and remain responsible
          for all messages sent from your WhatsApp business number.
        </p>
        <p>You agree to:</p>
        <ul>
          <li>Configure AI instructions honestly and in line with your actual offers and policies.</li>
          <li>Not use the Service to deceive customers, misrepresent products, or violate consumer protection laws.</li>
          <li>Supervise automated follow-ups and bargaining logic so they match your commercial terms.</li>
          <li>Comply with laws requiring human oversight or disclosure of automated systems where applicable.</li>
        </ul>
      </>
    ),
  },
  {
    id: "customer-data",
    title: "Your customers' data",
    content: (
      <>
        <p>
          When customers message your WhatsApp number, you typically act as the <strong>data controller</strong>{" "}
          for their personal data. We act as a <strong>processor</strong> on your instructions: we store message
          content, sender identifiers, and related metadata to operate the inbox, AI, orders, and blacklist
          features.
        </p>
        <p>
          You must provide customers with a lawful basis for processing (e.g. contract, consent, or legitimate
          interest as allowed in your jurisdiction), honor opt-out and access requests, and maintain your own
          privacy notice that describes WhatsApp and AI-assisted sales.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    content: (
      <>
        <p>You may not:</p>
        <ul>
          <li>Reverse engineer, scrape, or overload the Service or Meta APIs.</li>
          <li>Upload malware, unlawful content, or infringing product images or descriptions.</li>
          <li>Share dashboard access tokens with unauthorized parties.</li>
          <li>Use the Service to process payment card data outside of PCI-compliant channels you control.</li>
          <li>Circumvent blacklist, rate limits, or security controls.</li>
          <li>Resell or white-label the Service without our written permission.</li>
        </ul>
        <p>We may suspend or terminate access for violations or risk to other users or platforms.</p>
      </>
    ),
  },
  {
    id: "catalog-orders",
    title: "Catalog, pricing, orders, and follow-ups",
    content: (
      <>
        <p>
          You are solely responsible for product listings (including list price, discounts, bargain floors, stock
          or capacity quantities, and images). The Service may calculate quoted prices from your rules (e.g. list
          minus discount; bargain floor only after repeated discount requests in a thread).
        </p>
        <p>
          Orders may be created manually in the dashboard or automatically when the system detects a delivery
          address or explicit order intent in chat. You are responsible for fulfilling orders, refunds, and
          customer service.
        </p>
        <p>
          Automated follow-ups are sent only according to your configuration and timing settings. You must ensure
          such messages comply with WhatsApp&apos;s messaging policies (including marketing and opt-in rules where
          they apply).
        </p>
      </>
    ),
  },
  {
    id: "fees",
    title: "Fees, availability, and changes",
    content: (
      <>
        <p>
          Features and pricing may be offered free during beta or on a paid plan as described on our website. We may
          change features or pricing with reasonable notice where required.
        </p>
        <p>
          The Service is provided on an &quot;as available&quot; basis. Planned maintenance, Meta outages, AI
          provider outages, or database issues may interrupt inbox, automation, or webhooks.
        </p>
      </>
    ),
  },
  {
    id: "ip",
    title: "Intellectual property",
    content: (
      <>
        <p>
          We own the Service software, branding, and documentation. You retain ownership of your business content
          (product data, images, instructions, and messages). You grant us a limited license to host, process, and
          transmit your content solely to operate the Service.
        </p>
      </>
    ),
  },
  {
    id: "disclaimer",
    title: "Disclaimers and limitation of liability",
    content: (
      <>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT UNINTERRUPTED
          OR ERROR-FREE AI REPLIES, MESSAGE DELIVERY, OR SALES RESULTS.
        </p>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
          OR PUNITIVE DAMAGES, OR LOST PROFITS, ARISING FROM YOUR USE OF THE SERVICE, META/WHATSAPP, OR AI
          PROVIDERS. OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE IS LIMITED TO THE GREATER OF (A)
          AMOUNTS YOU PAID US IN THE TWELVE MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS (USD $100).
        </p>
        <p>
          Some jurisdictions do not allow certain limitations; in those cases our liability is limited to the
          fullest extent permitted by law.
        </p>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnification",
    content: (
      <p>
        You will defend and indemnify us against claims arising from your use of the Service, your messages to
        customers, your violation of these Terms or Meta/WhatsApp policies, or your violation of third-party rights.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Termination",
    content: (
      <>
        <p>
          You may stop using the Service at any time by disconnecting from Meta and ceasing dashboard use. We may
          suspend or terminate your access for breach, legal requirement, or discontinuation of the Service.
        </p>
        <p>
          Upon termination, your right to use the Service ends. Provisions that by nature should survive (liability
          limits, indemnity, governing law) remain in effect.
        </p>
      </>
    ),
  },
  {
    id: "changes-law",
    title: "Changes, governing law, and contact",
    content: (
      <>
        <p>
          We may update these Terms. We will post the revised version with a new &quot;Last updated&quot; date.
          Continued use after changes constitutes acceptance where permitted by law.
        </p>
        <p>
          These Terms are governed by the laws of the jurisdiction where {OPERATOR_NAME} is established, without
          regard to conflict-of-law rules, except where mandatory consumer protections in your country apply.
        </p>
        <p>
          Questions: <Link href="/contact-us">Contact support</Link> or see our{" "}
          <Link href="/privacy">Privacy Policy</Link> for data-related requests.
        </p>
      </>
    ),
  },
];
