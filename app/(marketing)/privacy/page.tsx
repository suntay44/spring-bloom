import { LegalPage } from "@/components/legal/LegalPage"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy — SpringBloom",
  description: "How SpringBloom collects, uses, and protects your personal data.",
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      subtitle="We built SpringBloom to respect your data. This policy explains what we collect, why, and what rights you have."
      effectiveDate="May 20, 2026"
    >
      <div className="notice-box">
        <strong>For lawyer review.</strong> This document was drafted based on GDPR, CCPA, and industry-standard
        SaaS privacy practices. Placeholders marked [BRACKET] require confirmation before publication.
      </div>

      <h2>1. Who Is Responsible for Your Data</h2>
      <p>
        SpringBloom, Inc. [ENTITY JURISDICTION TO BE CONFIRMED] is the data controller for personal data
        collected through the Services. Our address is [ADDRESS]. For privacy inquiries, contact us at{" "}
        <a href="mailto:privacy@springbloom.app">privacy@springbloom.app</a>.
      </p>
      <p>
        For users in the European Economic Area (EEA), United Kingdom, or Switzerland, our Data Protection
        Officer can be reached at <a href="mailto:dpo@springbloom.app">dpo@springbloom.app</a>.
      </p>

      <h2>2. What Data We Collect</h2>
      <h3>2.1 Information You Provide Directly</h3>
      <ul>
        <li><strong>Account data:</strong> name, email address, password (hashed)</li>
        <li><strong>Payment data:</strong> billing name, billing address — payment card details are processed directly by Stripe and are never stored on our servers</li>
        <li><strong>Project content:</strong> prompts you write, project names, brief answers, and generated application code</li>
        <li><strong>Communications:</strong> messages you send to our support team</li>
      </ul>
      <h3>2.2 Data Collected Automatically</h3>
      <ul>
        <li><strong>Usage data:</strong> pages visited, features used, button clicks, timestamps</li>
        <li><strong>Technical data:</strong> IP address, browser type, operating system, device type, referrer URL</li>
        <li><strong>Billing telemetry:</strong> credit consumption per generation (model, token counts, credit amounts) — linked to your account for billing and dispute resolution</li>
        <li><strong>Log data:</strong> server-side request logs retained for up to 90 days for security and debugging</li>
      </ul>
      <h3>2.3 Data from Third Parties</h3>
      <ul>
        <li>If you sign up using a social login (e.g., GitHub, Google), we receive your email address and public profile from that provider</li>
        <li>Stripe provides us with payment status and subscription state for billing purposes</li>
      </ul>

      <h2>3. How We Use Your Data</h2>
      <table>
        <thead>
          <tr>
            <th>Purpose</th>
            <th>Data Used</th>
            <th>Legal Basis (GDPR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Provide and operate the Services</td>
            <td>Account data, project content, usage data</td>
            <td>Contract performance</td>
          </tr>
          <tr>
            <td>Process payments and manage subscriptions</td>
            <td>Payment data, billing telemetry</td>
            <td>Contract performance</td>
          </tr>
          <tr>
            <td>Prevent fraud and ensure security</td>
            <td>IP address, usage data, log data</td>
            <td>Legitimate interest</td>
          </tr>
          <tr>
            <td>Improve platform performance</td>
            <td>Aggregated, anonymized usage statistics</td>
            <td>Legitimate interest</td>
          </tr>
          <tr>
            <td>Comply with legal obligations</td>
            <td>As required by law</td>
            <td>Legal obligation</td>
          </tr>
          <tr>
            <td>Send transactional emails (receipts, alerts)</td>
            <td>Email address</td>
            <td>Contract performance</td>
          </tr>
          <tr>
            <td>Send product updates and news (optional)</td>
            <td>Email address</td>
            <td>Consent (opt-in)</td>
          </tr>
        </tbody>
      </table>

      <h2>4. We Do Not Train AI on Your Data</h2>
      <p>
        <strong>SpringBloom does not use your prompts, project content, or generated application code to train,
        fine-tune, or evaluate AI models — ours or anyone else&rsquo;s.</strong>
      </p>
      <p>
        Your prompts are transmitted to third-party AI providers (Anthropic, and optionally OpenAI or Google)
        solely to generate your requested output. These providers process your prompts under their own terms.
        We have contractual agreements with them that restrict the use of your data. See their policies:
      </p>
      <ul>
        <li><a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer">Anthropic Privacy Policy</a></li>
        <li><a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer">OpenAI Privacy Policy</a></li>
        <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></li>
      </ul>
      <p>
        We may use aggregated, anonymized, and non-identifiable statistics (e.g., &ldquo;80% of prompts request
        Next.js projects&rdquo;) to improve our platform. This data cannot be used to identify you.
      </p>

      <h2>5. Data Sharing and Sub-processors</h2>
      <p>
        We share your data only with the third-party service providers (&ldquo;sub-processors&rdquo;) necessary
        to operate the Services. Our full sub-processor list is at <a href="/subprocessors">/subprocessors</a>.
        Key processors include:
      </p>
      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Purpose</th>
            <th>Data Shared</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Supabase</td>
            <td>Database and authentication</td>
            <td>Account data, project data</td>
          </tr>
          <tr>
            <td>Fly.io</td>
            <td>App preview and build machines</td>
            <td>Generated code, project files</td>
          </tr>
          <tr>
            <td>Anthropic</td>
            <td>Primary AI generation</td>
            <td>Prompts, context messages</td>
          </tr>
          <tr>
            <td>OpenAI / Google</td>
            <td>Optional AI generation</td>
            <td>Prompts, context messages (if selected)</td>
          </tr>
          <tr>
            <td>Stripe</td>
            <td>Payment processing</td>
            <td>Billing info, subscription status</td>
          </tr>
          <tr>
            <td>Cloudflare</td>
            <td>CDN and user app hosting</td>
            <td>Published app files</td>
          </tr>
          <tr>
            <td>Vercel</td>
            <td>Platform hosting</td>
            <td>Request data, log data</td>
          </tr>
          <tr>
            <td>Upstash</td>
            <td>Rate limiting (Redis)</td>
            <td>User ID, request timestamps</td>
          </tr>
        </tbody>
      </table>
      <p>
        We do not sell your personal data. We may disclose data to law enforcement or regulators when required
        by law, court order, or to protect the rights, property, or safety of SpringBloom, our users, or others.
      </p>

      <h2>6. Data Retention</h2>
      <ul>
        <li><strong>Account data:</strong> retained while your account is active; deleted within 30 days of account deletion request</li>
        <li><strong>Project content:</strong> deleted within 30 days of account deletion; backup copies purged within 90 days</li>
        <li><strong>Log data:</strong> retained for 90 days for security and debugging</li>
        <li><strong>Billing records:</strong> retained for [7] years as required by financial regulations [TO BE CONFIRMED]</li>
        <li><strong>Anonymized analytics:</strong> retained indefinitely (no personal data)</li>
      </ul>

      <h2>7. Security</h2>
      <p>
        We implement commercially reasonable technical and organizational measures to protect your data, including:
      </p>
      <ul>
        <li>Encryption in transit (TLS 1.2+) and at rest (AES-256)</li>
        <li>Role-based access controls — only engineers with a legitimate need can access production data</li>
        <li>Multi-factor authentication on all internal systems</li>
        <li>Service role keys for database access — never exposed to client-side code</li>
        <li>Regular security reviews</li>
      </ul>
      <p>
        In the event of a data breach that affects your personal data, we will notify you and relevant
        authorities within 72 hours as required by applicable law.
      </p>

      <h2>8. International Data Transfers</h2>
      <p>
        SpringBloom operates primarily in the United States. If you are located in the EEA, UK, or Switzerland,
        your data may be transferred to and processed in the United States. We rely on the following safeguards:
      </p>
      <ul>
        <li><strong>EEA:</strong> EU Standard Contractual Clauses (Module 2 — Controller to Processor)</li>
        <li><strong>UK:</strong> UK International Data Transfer Addendum</li>
        <li><strong>Switzerland:</strong> Swiss Federal Data Protection Addendum</li>
      </ul>
      <p>
        [LEGAL REVIEW REQUIRED: Confirm transfer mechanism and update if EU-US Data Privacy Framework applies.]
      </p>

      <h2>9. Your Rights</h2>
      <h3>9.1 All Users</h3>
      <ul>
        <li>Access the personal data we hold about you</li>
        <li>Request correction of inaccurate data</li>
        <li>Request deletion of your data (subject to legal retention requirements)</li>
        <li>Export your project data from your account settings</li>
        <li>Opt out of marketing emails via the unsubscribe link in any email</li>
      </ul>
      <h3>9.2 EEA / UK / Switzerland Residents (GDPR)</h3>
      <p>In addition to the above, you have the right to:</p>
      <ul>
        <li>Object to processing based on legitimate interests</li>
        <li>Request restriction of processing</li>
        <li>Data portability (receive your data in a machine-readable format)</li>
        <li>Lodge a complaint with your local supervisory authority</li>
        <li>Not be subject to solely automated decision-making with significant legal effects</li>
      </ul>
      <h3>9.3 US State Residents (CCPA / State Privacy Laws)</h3>
      <p>
        Residents of California, Colorado, Connecticut, Virginia, and other US states with applicable privacy
        laws have the right to:
      </p>
      <ul>
        <li>Know what personal data is collected about you</li>
        <li>Request deletion of your personal data</li>
        <li>Opt out of the &ldquo;sale&rdquo; of your personal data (note: SpringBloom does not sell personal data)</li>
        <li>Non-discrimination for exercising your rights</li>
      </ul>
      <p>
        To exercise any of these rights, email <a href="mailto:privacy@springbloom.app">privacy@springbloom.app</a>.
        We will respond within 30 days. We may need to verify your identity before processing your request.
      </p>

      <h2>10. Cookies</h2>
      <p>
        We use cookies and similar technologies. See our <a href="/cookies">Cookie Policy</a> for full details.
      </p>

      <h2>11. Children</h2>
      <p>
        The Services are not intended for anyone under 18 years of age. We do not knowingly collect personal
        data from minors. If we become aware that we have collected data from someone under 18, we will delete
        it promptly. If you believe a minor has provided us with personal data, contact us at{" "}
        <a href="mailto:privacy@springbloom.app">privacy@springbloom.app</a>.
      </p>

      <h2>12. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of material changes via email
        or in-product notice at least 14 days before they take effect. The updated policy will always be
        available at this URL with its effective date.
      </p>

      <h2>13. Contact Us</h2>
      <p>
        For privacy questions or to exercise your rights:<br />
        <strong>Email:</strong> <a href="mailto:privacy@springbloom.app">privacy@springbloom.app</a><br />
        <strong>DPO (EEA/UK/CH):</strong> <a href="mailto:dpo@springbloom.app">dpo@springbloom.app</a><br />
        <strong>Mail:</strong> SpringBloom, Inc., [ADDRESS]
      </p>
    </LegalPage>
  )
}
