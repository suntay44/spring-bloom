import { LegalPage } from "@/components/legal/LegalPage"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Acceptable Use Policy — SpringBloom",
  description: "Rules governing acceptable use of the SpringBloom platform.",
}

export default function AcceptableUsePage() {
  return (
    <LegalPage
      title="Acceptable Use Policy"
      subtitle="What you can and cannot do with SpringBloom. Violations may result in immediate account suspension."
      effectiveDate="May 20, 2026"
    >
      <p>
        This Acceptable Use Policy (&ldquo;AUP&rdquo;) applies to all users of the SpringBloom platform,
        APIs, and any apps deployed through our Services. It supplements our{" "}
        <a href="/terms">Terms of Service</a>. By using the Services you agree to this AUP.
      </p>

      <h2>1. Prohibited Content</h2>
      <p>You may not use the Services to generate, host, distribute, or transmit:</p>
      <ul>
        <li>Child sexual abuse material (CSAM) or any content that sexually exploits or harms minors — <strong>zero tolerance, immediate termination and report to authorities</strong></li>
        <li>Content that promotes, glorifies, or incites violence, terrorism, or mass harm</li>
        <li>Hate speech targeting individuals or groups based on protected characteristics (race, ethnicity, religion, gender, sexual orientation, disability, national origin)</li>
        <li>Defamatory, harassing, or threatening content directed at any individual or organization</li>
        <li>Non-consensual intimate imagery or deepfakes of real individuals</li>
        <li>Content that violates third-party intellectual property rights, including unauthorized use of copyrighted material or trademarks</li>
      </ul>

      <h2>2. Prohibited Technical Uses</h2>
      <p>You may not use the Services to:</p>
      <ul>
        <li>Create, distribute, or deploy malware, ransomware, spyware, trojans, worms, or other malicious code</li>
        <li>Build tools designed to compromise, exploit, or attack third-party systems without authorization (offensive security tools are prohibited; defensive / educational security tools require prior written approval)</li>
        <li>Conduct phishing attacks or create pages designed to deceive users into revealing credentials or personal information</li>
        <li>Mine cryptocurrency or perform computationally abusive tasks using SpringBloom infrastructure (Fly.io machines, API endpoints)</li>
        <li>Scrape or bulk-download content from SpringBloom or third-party services in violation of their terms</li>
        <li>Circumvent, disable, or interfere with platform security features, rate limits, credit systems, or access controls</li>
        <li>Use automated scripts to create accounts, generate credits, or simulate user activity</li>
        <li>Reverse engineer the SpringBloom platform, AI models, or underlying systems beyond what is permitted by applicable law</li>
        <li>Use AI Output generated on SpringBloom to train, fine-tune, or evaluate competing AI models</li>
      </ul>

      <h2>3. Prohibited Legal Uses</h2>
      <p>You may not use the Services to:</p>
      <ul>
        <li>Violate any applicable local, national, or international law or regulation</li>
        <li>Process payment card data in ways that violate PCI-DSS without proper compliance measures</li>
        <li>Collect or process personal data in ways that violate applicable privacy laws (GDPR, CCPA, etc.)</li>
        <li>Violate export control or trade sanction laws — including building apps for or on behalf of sanctioned parties or countries</li>
        <li>Engage in deceptive trade practices, false advertising, or consumer fraud</li>
        <li>Build tools to facilitate academic fraud, exam cheating, or plagiarism in educational contexts where explicitly prohibited</li>
      </ul>

      <h2>4. AI Responsibility</h2>
      <p>
        SpringBloom provides AI generation tools. You are responsible for reviewing and validating any
        AI-generated code or content before deploying it to production or sharing it with users. Specifically:
      </p>
      <ul>
        <li>Do not deploy AI-generated code to production without independent security review</li>
        <li>Do not use AI Output for medical diagnosis, legal advice, financial advice, or safety-critical systems without appropriate professional oversight</li>
        <li>Do not mislead users of your generated apps into thinking they are interacting with a human when they are not</li>
        <li>Do not use the Services to generate disinformation, propaganda, or synthetic media designed to deceive the public</li>
      </ul>

      <h2>5. Infrastructure Responsibility</h2>
      <p>
        Each project you create may spin up a Fly.io preview machine. You are responsible for the code
        running in that environment. Do not use your preview environment to:
      </p>
      <ul>
        <li>Host persistent services beyond testing and preview purposes</li>
        <li>Store sensitive user data of your end users without appropriate safeguards</li>
        <li>Launch network attacks or port scans against any system</li>
        <li>Serve content that violates this AUP</li>
      </ul>

      <h2>6. Reporting Violations</h2>
      <p>
        If you become aware of content or behavior on SpringBloom that violates this AUP, please report it to{" "}
        <a href="mailto:trust@springbloom.app">trust@springbloom.app</a>. We investigate all credible reports
        and take appropriate action.
      </p>

      <h2>7. Enforcement</h2>
      <p>
        SpringBloom reserves the right to investigate any suspected violation of this AUP. Consequences for
        violations may include:
      </p>
      <ul>
        <li>Warning or content removal for minor first-time violations</li>
        <li>Temporary suspension for repeated or more serious violations</li>
        <li>Permanent account termination for severe violations, with forfeiture of any credits</li>
        <li>Report to law enforcement for illegal activity</li>
      </ul>
      <p>
        We may act without prior notice where the violation poses an immediate risk to users, infrastructure,
        or third parties.
      </p>

      <h2>8. Updates</h2>
      <p>
        We may update this AUP as the platform evolves. Material changes will be communicated via email or
        in-product notice. Questions? Contact <a href="mailto:trust@springbloom.app">trust@springbloom.app</a>.
      </p>
    </LegalPage>
  )
}
