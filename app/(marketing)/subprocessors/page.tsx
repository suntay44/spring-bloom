import { LegalPage } from "@/components/legal/LegalPage"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sub-processors — SpringBloom",
  description: "Third-party services that process data on behalf of SpringBloom.",
}

const SUBPROCESSORS = [
  {
    name: "Supabase",
    purpose: "Relational database (PostgreSQL) and user authentication for the SpringBloom platform",
    data: "Account data, project data, messages, credit transactions",
    location: "United States (AWS us-east-1)",
    link: "https://supabase.com/privacy",
  },
  {
    name: "Fly.io",
    purpose: "Container machines for live app preview and build execution",
    data: "Generated application code, project files, environment variables",
    location: "United States and other regions (user-selected)",
    link: "https://fly.io/legal/privacy-policy",
  },
  {
    name: "Anthropic",
    purpose: "Primary AI model provider for code and app generation",
    data: "User prompts, conversation context",
    location: "United States",
    link: "https://www.anthropic.com/privacy",
  },
  {
    name: "OpenAI",
    purpose: "Optional AI model provider (if selected by user)",
    data: "User prompts, conversation context (only when OpenAI model is selected)",
    location: "United States",
    link: "https://openai.com/policies/privacy-policy",
  },
  {
    name: "Google (Gemini)",
    purpose: "Optional AI model provider (if selected by user)",
    data: "User prompts, conversation context (only when Google model is selected)",
    location: "United States",
    link: "https://policies.google.com/privacy",
  },
  {
    name: "Stripe",
    purpose: "Payment processing, subscription management, invoicing",
    data: "Billing name, billing address, payment status — card numbers are never stored by SpringBloom",
    location: "United States",
    link: "https://stripe.com/privacy",
  },
  {
    name: "Cloudflare",
    purpose: "Content delivery network (CDN) and hosting for user-published applications",
    data: "Published application files, user IP addresses (CDN logs)",
    location: "Global edge network",
    link: "https://www.cloudflare.com/privacypolicy/",
  },
  {
    name: "Vercel",
    purpose: "Hosting and deployment platform for the SpringBloom web application",
    data: "HTTP request logs, edge function logs",
    location: "United States and global edge",
    link: "https://vercel.com/legal/privacy-policy",
  },
  {
    name: "Upstash",
    purpose: "Serverless Redis for rate limiting",
    data: "User ID hashes and request timestamps (no personal content)",
    location: "United States (AWS us-east-1)",
    link: "https://upstash.com/privacy",
  },
]

export default function SubprocessorsPage() {
  return (
    <LegalPage
      title="Sub-processors"
      subtitle="Third-party companies that process personal data on our behalf to deliver the SpringBloom platform."
      effectiveDate="May 20, 2026"
    >
      <p>
        As part of providing the Services, SpringBloom engages the third-party sub-processors listed below.
        All sub-processors are bound by data processing agreements that require them to protect your data
        and use it only for the purposes described. This list is updated when we add or remove sub-processors.
        We will provide 10 days&rsquo; advance notice of any additions via this page and, for users subject to
        GDPR, by email if requested.
      </p>
      <p>
        For context on how your data flows through these services, see our{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>Current Sub-processors</h2>
      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Purpose</th>
            <th>Data Processed</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          {SUBPROCESSORS.map((sp) => (
            <tr key={sp.name}>
              <td>
                <a href={sp.link} target="_blank" rel="noopener noreferrer">
                  {sp.name}
                </a>
              </td>
              <td>{sp.purpose}</td>
              <td>{sp.data}</td>
              <td>{sp.location}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Objection Process</h2>
      <p>
        If you are a Business or Enterprise customer subject to a Data Processing Agreement (DPA) and wish to
        object to a new sub-processor, please email{" "}
        <a href="mailto:privacy@springbloom.app">privacy@springbloom.app</a> within 10 days of notification.
        We will work with you to address your concern; if we are unable to resolve the objection, you may
        terminate the relevant services without penalty.
      </p>

      <h2>Questions</h2>
      <p>
        For questions about our sub-processors or data processing practices, contact{" "}
        <a href="mailto:privacy@springbloom.app">privacy@springbloom.app</a>.
      </p>
    </LegalPage>
  )
}
