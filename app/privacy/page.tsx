import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy — Dulra',
  description:
    'How Glas Future Ltd t/a Dulra collects, uses, and safeguards your data when you use the Dulra platform.',
}

export default function PrivacyPage() {
  return (
    <div className="bg-background min-h-screen">
      <header className="border-border bg-background/80 sticky top-0 z-40 border-b backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center">
            <img src="/dulra-logo.jpg" alt="Dulra" className="h-8 dark:invert" />
          </Link>
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-6 py-16">
        <div className="mb-12">
          <h1 className="text-foreground mb-3 text-4xl font-bold tracking-tight md:text-5xl">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-sm">Effective Date: May 13, 2026</p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <section className="mb-10">
            <h2 className="text-foreground mb-3 text-xl font-semibold">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Glas Future Ltd t/a Dulra (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;),
              a company registered in Ireland (Company No: 696508) with a registered office at RDI
              Hub, Killorglin, Co. Kerry, is committed to protecting your privacy. This policy
              explains how we collect, use, and safeguard your data when you use our mobile
              application.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-foreground mb-3 text-xl font-semibold">2. Data We Collect</h2>
            <ul className="text-muted-foreground list-disc space-y-2 pl-6 leading-relaxed">
              <li>
                <strong className="text-foreground">Account Information:</strong> Name, email
                address, and login credentials.
              </li>
              <li>
                <strong className="text-foreground">Usage Data:</strong> Information on how you
                interact with the app (via Apple&rsquo;s opt-in diagnostics).
              </li>
              <li>
                <strong className="text-foreground">Device Information:</strong> Device model,
                operating system version, and unique identifiers.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-foreground mb-3 text-xl font-semibold">
              3. Legal Basis for Processing
            </h2>
            <p className="text-muted-foreground mb-3 leading-relaxed">
              Under GDPR, we process your data based on:
            </p>
            <ul className="text-muted-foreground list-disc space-y-2 pl-6 leading-relaxed">
              <li>
                <strong className="text-foreground">Contractual Necessity:</strong> To provide the
                services you signed up for.
              </li>
              <li>
                <strong className="text-foreground">Consent:</strong> Where you have given us clear
                permission (e.g., marketing).
              </li>
              <li>
                <strong className="text-foreground">Legal Obligation:</strong> To comply with Irish
                or EU law.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-foreground mb-3 text-xl font-semibold">
              4. Data Sharing and Third Parties
            </h2>
            <p className="text-muted-foreground mb-3 leading-relaxed">
              We do not sell your data. We only share information with:
            </p>
            <ul className="text-muted-foreground list-disc space-y-2 pl-6 leading-relaxed">
              <li>
                <strong className="text-foreground">Service Providers:</strong> Such as cloud
                hosting or analytics (e.g., Firebase, AWS).
              </li>
              <li>
                <strong className="text-foreground">Legal Authorities:</strong> If required by law
                to prevent fraud or protect safety.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-foreground mb-3 text-xl font-semibold">5. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You have the right to access, rectify, or erase your personal data. You may also
              object to processing or request data portability. To exercise these rights, contact us
              at the address below.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-foreground mb-3 text-xl font-semibold">6. Contact Us</h2>
            <div className="border-border bg-muted/50 not-prose rounded-lg border p-6">
              <p className="text-foreground font-semibold">Glas Future Ltd t/a Dulra</p>
              <p className="text-muted-foreground">RDI Hub, Killorglin, Co. Kerry, Ireland</p>
              <p className="text-muted-foreground mt-2">
                Email:{' '}
                <a
                  href="mailto:hello@dulra.io"
                  className="text-green-600 hover:underline dark:text-green-400"
                >
                  hello@dulra.io
                </a>
              </p>
            </div>
          </section>
        </div>

        <div className="border-border mt-16 border-t pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex gap-4">
              <Link
                href="/terms"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms of Use →
              </Link>
              <Link
                href="/support"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Support →
              </Link>
            </div>
            <p className="text-muted-foreground">© Dulra 2026</p>
          </div>
        </div>
      </main>
    </div>
  )
}
