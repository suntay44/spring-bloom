import Link from "next/link"
import { Logo } from "@/components/shared/Logo"

const PRODUCT_LINKS = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Security", href: "/security" },
]

const LEGAL_LINKS = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Acceptable Use", href: "/acceptable-use" },
  { label: "Cookie Policy", href: "/cookies" },
  { label: "Sub-processors", href: "/subprocessors" },
  { label: "Refund Policy", href: "/refund" },
]

const COMPANY_LINKS = [
  { label: "News", href: "/news" },
  { label: "Status", href: "https://status.springbloom.app", external: true },
  { label: "GitHub", href: "https://github.com", external: true },
]

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-zinc-800 bg-zinc-950">
      <div className="container py-12">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/">
              <Logo />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-zinc-500">
              AI-powered builder for web and mobile apps. Describe it, approve it, ship it.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">Product</p>
            <ul className="space-y-2.5">
              {PRODUCT_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="text-sm text-zinc-500 transition-colors hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">Resources</p>
            <ul className="space-y-2.5">
              {COMPANY_LINKS.map(({ label, href, external }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-zinc-500 transition-colors hover:text-white"
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">Legal</p>
            <ul className="space-y-2.5">
              {LEGAL_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="text-sm text-zinc-500 transition-colors hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800 pt-8">
          <p className="text-sm text-zinc-600">
            &copy; {year} SpringBloom, Inc. All rights reserved.
          </p>
          <p className="text-sm text-zinc-600">
            Built with AI. Reviewed by humans.
          </p>
        </div>
      </div>
    </footer>
  )
}
