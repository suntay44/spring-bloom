import { LegalPage } from "@/components/legal/LegalPage"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Refund Policy — SpringBloom",
  description: "SpringBloom's policy on refunds for subscriptions and credit purchases.",
}

export default function RefundPage() {
  return (
    <LegalPage
      title="Refund Policy"
      subtitle="Our policy on subscriptions, credit purchases, and when refunds are available."
      effectiveDate="May 20, 2026"
    >
      <p>
        This Refund Policy applies to all purchases made on the SpringBloom platform and supplements our{" "}
        <a href="/terms">Terms of Service</a>. By making a purchase you agree to this policy.
      </p>

      <h2>1. Credit Packs (One-Time Purchases)</h2>
      <p>
        <strong>Credit packs are non-refundable.</strong> Once purchased, credits are immediately available
        in your account and begin to be consumed when you use AI generation features. Because the economic
        value of credits is consumed on use and we incur AI provider costs for each generation, we are unable
        to offer refunds on credit packs.
      </p>
      <p>
        <strong>Exception — billing errors:</strong> If you were charged incorrectly (e.g., charged twice for
        the same transaction, or charged an amount different from the stated price), contact us within 30 days
        at <a href="mailto:billing@springbloom.app">billing@springbloom.app</a> and we will investigate and
        issue a refund if a billing error is confirmed.
      </p>

      <h2>2. Subscriptions</h2>
      <h3>2.1 Monthly Plans</h3>
      <p>
        Monthly subscriptions are billed in advance at the start of each billing period. Subscriptions are
        <strong> non-refundable for the current billing period</strong>. You may cancel at any time from your
        account settings, and cancellation will take effect at the end of the current period — you retain
        access to paid features until then. No partial-period refunds are issued.
      </p>
      <h3>2.2 Annual Plans</h3>
      <p>
        Annual subscriptions are billed upfront for 12 months. We offer a <strong>14-day refund window</strong>{" "}
        from the date of your annual subscription purchase. If you cancel within 14 days and have not consumed
        more than 20% of the annual credit allocation, we will refund the full annual amount. After 14 days,
        annual subscriptions are non-refundable.
      </p>
      <h3>2.3 Downgrades</h3>
      <p>
        If you downgrade your plan mid-cycle, the downgrade takes effect at the next billing period. No
        refund is issued for the difference in the current period.
      </p>

      <h2>3. Free Tier</h2>
      <p>
        There is nothing to refund for the free tier, as no payment is required.
      </p>

      <h2>4. Service Interruptions</h2>
      <p>
        If the SpringBloom platform experiences a significant outage (defined as more than 4 hours of
        continuous unavailability in a calendar month), affected paid subscribers may request a prorated
        credit to their SpringBloom account for the affected period. We do not issue cash refunds for
        service interruptions, but we will make affected users whole in credits. Contact{" "}
        <a href="mailto:billing@springbloom.app">billing@springbloom.app</a> within 30 days of the incident.
      </p>

      <h2>5. Account Termination by SpringBloom</h2>
      <p>
        If SpringBloom terminates your account for a violation of our{" "}
        <a href="/terms">Terms of Service</a> or <a href="/acceptable-use">Acceptable Use Policy</a>, no
        refund will be issued for any unused credits or remaining subscription period.
      </p>
      <p>
        If SpringBloom terminates your account without cause (e.g., we discontinue the Services), we will
        refund the pro-rated unused portion of any prepaid subscription fees.
      </p>

      <h2>6. How to Request a Refund</h2>
      <p>
        To request a refund under this policy, email{" "}
        <a href="mailto:billing@springbloom.app">billing@springbloom.app</a> with:
      </p>
      <ul>
        <li>Your account email address</li>
        <li>The date and amount of the charge</li>
        <li>The reason for the refund request</li>
      </ul>
      <p>
        We will respond within 5 business days. Approved refunds are processed to the original payment method
        and typically appear within 5–10 business days depending on your bank or card issuer.
      </p>

      <h2>7. Statutory Rights</h2>
      <p>
        Nothing in this policy limits any statutory rights you may have under applicable consumer protection
        law. If you are located in the EU, UK, or another jurisdiction that provides statutory cancellation
        or cooling-off rights, those rights apply in addition to this policy. Contact us if you wish to
        exercise your statutory rights.
      </p>

      <h2>8. Contact</h2>
      <p>
        Billing questions: <a href="mailto:billing@springbloom.app">billing@springbloom.app</a><br />
        General legal: <a href="mailto:legal@springbloom.app">legal@springbloom.app</a>
      </p>
    </LegalPage>
  )
}
