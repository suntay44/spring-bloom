import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  typedRoutes: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" }
    ]
  },
  async headers() {
    // Content-Security-Policy — permissive enough to keep Next.js, Stripe,
    // Supabase, and the in-app preview iframe working, but blocks arbitrary
    // external scripts/iframes.
    //
    //  - 'unsafe-inline' on script/style is required by Next.js hydration and
    //    Tailwind injected styles (no nonce-based runtime yet in Next 16).
    //  - connect-src includes Supabase (REST + Realtime) and Stripe API.
    //  - frame-src whitelists Stripe-hosted payment + Connect pages.
    //  - frame-ancestors 'none' replaces X-Frame-Options DENY (modern equivalent).
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https: ",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://api.machines.dev https://api.fly.io",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://connect.stripe.com https://*.fly.dev",
      "form-action 'self' https://checkout.stripe.com https://connect.stripe.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; ")

    return [
      {
        source: "/(.*)",
        headers: [
          // HSTS — force HTTPS for 2 years, include subdomains, eligible for browser preload list
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // Modern clickjacking protection (replaces X-Frame-Options for CSP-aware browsers)
          { key: "Content-Security-Policy", value: csp },
          // Legacy clickjacking protection (older browsers without CSP)
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Cross-origin isolation — protects Stripe popup auth flows from cross-window attacks
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ]
      }
    ];
  }
};

export default nextConfig;
