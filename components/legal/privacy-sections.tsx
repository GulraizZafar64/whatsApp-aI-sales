import Link from "next/link";
import type { LegalSection } from "@/components/legal/LegalPageShell";
import {
  APP_NAME,
  OPERATOR_NAME,
  LEGAL_WHATSAPP_PRIVACY,
  LEGAL_WHATSAPP_SUPPORT,
} from "@/lib/legal-site";

export const privacySections: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    content: (
      <>
        <p>
          This Privacy Policy explains how {OPERATOR_NAME} (&quot;we,&quot; &quot;us&quot;) collects, uses, stores,
          and shares information when you use the {APP_NAME} website, dashboard, and WhatsApp automation features
          (the &quot;Service&quot;).
        </p>
        <p>
          This policy should be read with our <Link href="/terms">Terms of Service</Link>. If you use the Service on
          behalf of a business, you represent that you have authority to accept this policy for that business.
        </p>
      </>
    ),
  },
  {
    id: "roles",
    title: "Who is responsible for what data",
    content: (
      <>
        <p>
          <strong>Business users (you):</strong> When you connect WhatsApp and message your customers, you are
          usually the <strong>data controller</strong> for your customers&apos; personal data (phone numbers, names,
          message content, order details).
        </p>
        <p>
          <strong>{APP_NAME} (us):</strong> We process data on your behalf as a <strong>data processor</strong> to
          provide inbox storage, AI replies, orders, activity logs, blacklist, and follow-ups. You are responsible for
          having a lawful basis to message customers and for your own customer-facing privacy notice.
        </p>
        <p>
          <strong>Meta / WhatsApp:</strong> Meta processes data under its own policies when you use WhatsApp Cloud
          API. See{" "}
          <a href="https://www.whatsapp.com/legal/privacy-policy-business" target="_blank" rel="noopener noreferrer">
            WhatsApp Business Privacy Policy
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "business-user-data",
    title: "Information we collect from business users",
    content: (
      <>
        <p>When you sign up, connect Meta, or use the dashboard, we may collect:</p>
        <ul>
          <li>
            <strong>Business profile:</strong> business name, business type, country.
          </li>
          <li>
            <strong>WhatsApp connection data:</strong> phone number ID, WhatsApp Business Account ID, display phone
            number, and Meta access token associated with your connection (stored in our database for session and
            API routing; outbound sends may use a server-configured system token as described in our technical
            documentation).
          </li>
          <li>
            <strong>Catalog data:</strong> product names, descriptions, prices, discounts, bargaining floors,
            quantities, colors, and product images (stored in our database, including as encoded image data).
          </li>
          <li>
            <strong>AI configuration:</strong> custom AI instruction text, reply tone settings, and optional
            per-business API keys if you provide them.
          </li>
          <li>
            <strong>Dashboard usage:</strong> orders you create or that the system records from chat, completed
            orders, blacklist entries, and activity events.
          </li>
          <li>
            <strong>Browser session:</strong> after Meta login, identifiers such as access token and phone number ID
            may be stored in your browser&apos;s <strong>local storage</strong> to authenticate dashboard API requests.
          </li>
          <li>
            <strong>Support communications</strong> if you contact us.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "customer-data",
    title: "Information we process about your customers",
    content: (
      <>
        <p>When customers message your connected WhatsApp number, we may process:</p>
        <ul>
          <li>WhatsApp user ID and profile name (when provided by Meta webhooks).</li>
          <li>Message text and message type (inbound and outbound).</li>
          <li>Timestamps, delivery/read status where available, and direction (customer vs business).</li>
          <li>
            Data inferred for features: product interest, order or delivery details, discount negotiation context,
            and whether a contact is blacklisted.
          </li>
        </ul>
        <p>
          This data is stored in our application database (MySQL) to power the inbox, AI context, orders, and
          automation. We do not sell customer message content to third parties for their own marketing.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "How we use information",
    content: (
      <>
        <p>We use information to:</p>
        <ul>
          <li>Provide, maintain, and secure the Service.</li>
          <li>Route inbound WhatsApp webhooks to the correct business account.</li>
          <li>Generate and send AI-assisted and scheduled follow-up WhatsApp messages.</li>
          <li>Display chats, orders, products, and activity in your dashboard.</li>
          <li>Enforce blacklist rules and prevent abuse.</li>
          <li>Improve reliability, debug errors, and comply with law.</li>
          <li>Communicate with you about the Service.</li>
        </ul>
        <p>
          <strong>Legal bases</strong> (where GDPR or similar laws apply): performance of our contract with you;
          legitimate interests in operating and securing the Service; compliance with legal obligations; and, where
          required, your consent (e.g. for optional marketing from us to you—not for your end-customer campaigns,
          which you control).
        </p>
      </>
    ),
  },
  {
    id: "ai-processing",
    title: "AI processing (Anthropic)",
    content: (
      <>
        <p>
          To generate replies, we send relevant context to <strong>Anthropic</strong> (Claude models), which may
          include recent message history, product catalog excerpts, your AI instructions, and pricing rules. Anthropic
          processes this data under its terms and privacy policy as a sub-processor.
        </p>
        <p>
          We configure the Service to use an API key from server environment variables and/or a key you optionally
          store on your business record. Do not share API keys publicly. We take steps to avoid sending unnecessary
          personal data in prompts, but message content may include customer identifiers and order details.
        </p>
        <p>
          See{" "}
          <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer">
            Anthropic&apos;s Privacy Policy
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "When we share information",
    content: (
      <>
        <p>We may share information with:</p>
        <ul>
          <li>
            <strong>Meta / WhatsApp</strong> — to send and receive messages via the Cloud API.
          </li>
          <li>
            <strong>Anthropic</strong> — for AI-generated responses as described above.
          </li>
          <li>
            <strong>Infrastructure providers</strong> — hosting and database services that store encrypted data in
            transit (HTTPS) and at rest according to provider capabilities.
          </li>
          <li>
            <strong>Professional advisers or authorities</strong> — when required by law or to protect rights and
            safety.
          </li>
          <li>
            <strong>Business transfers</strong> — in connection with a merger, acquisition, or asset sale, with
            notice where required.
          </li>
        </ul>
        <p>We do not sell your personal information for cross-context behavioral advertising.</p>
      </>
    ),
  },
  {
    id: "security-retention",
    title: "Security and retention",
    content: (
      <>
        <p>
          We use administrative, technical, and organizational measures appropriate to the Service (access controls,
          HTTPS, secured credentials in environment configuration, etc.). No method of transmission or storage is
          100% secure.
        </p>
        <p>
          We retain business and message data while your account is active and as needed for legal, dispute, or
          backup purposes. You may request deletion subject to limitations (e.g. logs we must keep for security or
          law). Customer data deletion requests from individuals should generally be directed to you as controller;
          we will assist where required by law and our agreement with you.
        </p>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your rights and choices",
    content: (
      <>
        <p>Depending on your location, you may have the right to:</p>
        <ul>
          <li>Access, correct, or delete personal data we hold about you as a business user.</li>
          <li>Object to or restrict certain processing.</li>
          <li>Data portability.</li>
          <li>Withdraw consent where processing is consent-based.</li>
          <li>Lodge a complaint with a supervisory authority.</li>
        </ul>
        <p>
          To exercise rights, contact us on{" "}
          <a href={LEGAL_WHATSAPP_PRIVACY} target="_blank" rel="noopener noreferrer">
            WhatsApp (privacy requests)
          </a>
          . We may verify your identity. For customer data,
          contact your seller (the business) first; we can support them on your request where applicable.
        </p>
        <p>
          You can clear browser local storage and disconnect Meta to end dashboard sessions. Disconnecting does not
          automatically delete all server-side records until you request deletion or we apply retention policies.
        </p>
      </>
    ),
  },
  {
    id: "international",
    title: "International transfers",
    content: (
      <p>
        We and our subprocessors may process data in countries other than yours. Where required, we rely on
        appropriate safeguards (such as standard contractual clauses or equivalent mechanisms) for transfers from
        the EEA, UK, or other regions with transfer restrictions.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    content: (
      <p>
        The Service is for businesses and is not directed at children under 16 (or the age required in your
        jurisdiction). We do not knowingly collect children&apos;s personal data through the Service.
      </p>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and similar technologies",
    content: (
      <>
        <p>
          We use essential technologies to operate the site (e.g. session-related storage). Third-party scripts such
          as the <strong>Meta JavaScript SDK</strong> may set cookies or similar identifiers when you use &quot;Continue
          with WhatsApp&quot; on sign-in or get-started flows. See Meta&apos;s cookie and privacy documentation for
          details.
        </p>
      </>
    ),
  },
  {
    id: "changes-contact",
    title: "Changes and contact",
    content: (
      <>
        <p>
          We may update this Privacy Policy. We will post the new version with an updated date. Material changes may
          be notified via the Service or WhatsApp where appropriate.
        </p>
        <p>
          <strong>Contact (WhatsApp only):</strong>
          <br />
          Privacy:{" "}
          <a href={LEGAL_WHATSAPP_PRIVACY} target="_blank" rel="noopener noreferrer">
            Message us on WhatsApp
          </a>
          <br />
          Support:{" "}
          <a href={LEGAL_WHATSAPP_SUPPORT} target="_blank" rel="noopener noreferrer">
            Support on WhatsApp
          </a>
          <br />
          <Link href="/contact-us">Contact page</Link>
        </p>
      </>
    ),
  },
];
