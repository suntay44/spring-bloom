import { LegalPage } from "@/components/legal/LegalPage"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cookie Policy — SpringBloom",
  description: "How SpringBloom uses cookies and similar tracking technologies.",
}

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      subtitle="What cookies and similar technologies we use, why, and how to control them."
      effectiveDate="May 20, 2026"
    >
      <p>
        This Cookie Policy explains how SpringBloom, Inc. (&ldquo;SpringBloom,&rdquo; &ldquo;we,&rdquo; or
        &ldquo;us&rdquo;) uses cookies and similar technologies when you visit our website or use our platform.
        It should be read together with our <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>1. What Are Cookies?</h2>
      <p>
        Cookies are small text files placed on your device by websites you visit. They are widely used to make
        websites work, to work more efficiently, and to provide analytics information to site owners.
        We also use localStorage and sessionStorage, which operate similarly but are stored in your browser.
      </p>

      <h2>2. Cookies We Use</h2>
      <h3>2.1 Strictly Necessary Cookies</h3>
      <p>
        These cookies are essential for the platform to function. They cannot be disabled without breaking
        core features. No consent is required for these under applicable law.
      </p>
      <table>
        <thead>
          <tr>
            <th>Cookie / Key</th>
            <th>Purpose</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>sb-[ref]-auth-token</code></td>
            <td>Supabase authentication session token — keeps you logged in</td>
            <td>Session / up to 1 week</td>
          </tr>
          <tr>
            <td><code>sb-[ref]-auth-token-code-verifier</code></td>
            <td>PKCE code verifier for OAuth login flows</td>
            <td>Session</td>
          </tr>
          <tr>
            <td>CSRF token</td>
            <td>Cross-site request forgery protection</td>
            <td>Session</td>
          </tr>
        </tbody>
      </table>

      <h3>2.2 Functional Cookies</h3>
      <p>
        These cookies remember your preferences and improve your experience. They are set when you interact
        with certain features.
      </p>
      <table>
        <thead>
          <tr>
            <th>Cookie / Key</th>
            <th>Purpose</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>sb-theme</code></td>
            <td>Stores your UI theme preference (dark / light)</td>
            <td>1 year</td>
          </tr>
          <tr>
            <td><code>sb-last-model</code></td>
            <td>Remembers your last selected AI model in the builder</td>
            <td>30 days</td>
          </tr>
        </tbody>
      </table>

      <h3>2.3 Analytics Cookies</h3>
      <p>
        We may use privacy-respecting analytics to understand how users interact with our platform.
        Analytics data is aggregated and does not identify individual users.
        [CONFIRM ANALYTICS PROVIDER — e.g., PostHog, Plausible, or none — before publishing]
      </p>
      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Purpose</th>
            <th>Duration</th>
            <th>Policy</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>[Analytics Provider]</td>
            <td>Page views, feature usage, session duration — aggregated only</td>
            <td>Up to 13 months</td>
            <td>[Link to provider policy]</td>
          </tr>
        </tbody>
      </table>

      <h3>2.4 What We Do Not Use</h3>
      <ul>
        <li>We do not use advertising or retargeting cookies</li>
        <li>We do not share cookie data with ad networks</li>
        <li>We do not use cookies to build behavioral profiles for sale to third parties</li>
      </ul>

      <h2>3. How to Control Cookies</h2>
      <h3>3.1 Browser Settings</h3>
      <p>
        You can control or delete cookies through your browser settings. Be aware that disabling strictly
        necessary cookies will prevent you from logging into the platform. Links to cookie management guides
        for common browsers:
      </p>
      <ul>
        <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Chrome</a></li>
        <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer">Firefox</a></li>
        <li><a href="https://support.apple.com/en-us/105082" target="_blank" rel="noopener noreferrer">Safari</a></li>
        <li><a href="https://support.microsoft.com/en-us/windows/manage-cookies-in-microsoft-edge-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer">Edge</a></li>
      </ul>
      <h3>3.2 Analytics Opt-Out</h3>
      <p>
        If we use analytics cookies, you can opt out by [CONFIRM OPT-OUT MECHANISM — e.g., browser Do Not
        Track signal, in-product toggle, or provider opt-out link].
      </p>

      <h2>4. Changes to This Policy</h2>
      <p>
        We may update this Cookie Policy as we change our cookie usage. Material changes will be communicated
        via our website or email. The current version is always available at this URL.
      </p>

      <h2>5. Contact</h2>
      <p>
        Questions about cookies? Email us at{" "}
        <a href="mailto:privacy@springbloom.app">privacy@springbloom.app</a>.
      </p>
    </LegalPage>
  )
}
