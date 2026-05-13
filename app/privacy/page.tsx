import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy & Terms of Use — Dulra',
  description:
    'How Glas Future Ltd t/a Dulra collects, uses, and safeguards your data, and the terms governing your use of the Dulra platform.',
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
            Privacy Policy &amp; Terms of Use
          </h1>
          <p className="text-muted-foreground text-sm">Effective Date: May 13, 2026</p>
        </div>

        {/* Quick navigation */}
        <nav className="border-border bg-muted/50 mb-12 rounded-lg border p-4">
          <p className="text-foreground mb-2 text-sm font-semibold">On this page</p>
          <ul className="text-muted-foreground space-y-1 text-sm">
            <li>
              <a href="#privacy" className="hover:text-foreground transition-colors">
                → Privacy Policy
              </a>
            </li>
            <li>
              <a href="#terms" className="hover:text-foreground transition-colors">
                → Terms of Use
              </a>
            </li>
            <li>
              <a href="#contact" className="hover:text-foreground transition-colors">
                → Contact &amp; Company Information
              </a>
            </li>
          </ul>
        </nav>

        {/* PRIVACY POLICY */}
        <div id="privacy" className="prose prose-neutral dark:prose-invert max-w-none scroll-mt-24">
          <h2 className="text-foreground border-border mb-6 border-b pb-3 text-3xl font-bold">
            Privacy Policy
          </h2>

          <section className="mb-10">
            <h3 className="text-foreground mb-3 text-xl font-semibold">1. Introduction</h3>
            <p className="text-muted-foreground leading-relaxed">
              Glas Future Ltd t/a Dulra (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;),
              a company registered in Ireland (Company No: 696508) with a registered office at RDI
              Hub, Killorglin, Co. Kerry, is committed to protecting your privacy. This policy
              explains how we collect, use, and safeguard your data when you use our mobile
              application.
            </p>
          </section>

          <section className="mb-10">
            <h3 className="text-foreground mb-3 text-xl font-semibold">2. Data We Collect</h3>
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
            <h3 className="text-foreground mb-3 text-xl font-semibold">
              3. Legal Basis for Processing
            </h3>
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
            <h3 className="text-foreground mb-3 text-xl font-semibold">
              4. Data Sharing and Third Parties
            </h3>
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
            <h3 className="text-foreground mb-3 text-xl font-semibold">5. Your Rights</h3>
            <p className="text-muted-foreground leading-relaxed">
              You have the right to access, rectify, or erase your personal data. You may also
              object to processing or request data portability. To exercise these rights, contact us
              at the address below.
            </p>
          </section>
        </div>

        {/* TERMS OF USE */}
        <div
          id="terms"
          className="prose prose-neutral dark:prose-invert mt-16 max-w-none scroll-mt-24"
        >
          <h2 className="text-foreground border-border mb-6 border-b pb-3 text-3xl font-bold">
            Terms of Use
          </h2>
          <p className="text-muted-foreground mb-8 text-sm">Last Updated: May 13, 2026</p>

          <section className="mb-10">
            <h3 className="text-foreground mb-3 text-xl font-semibold">1. Agreement to Terms</h3>
            <p className="text-muted-foreground leading-relaxed">
              By downloading or using the Dulra app, you agree to be bound by these Terms of Use and
              our Privacy Policy. If you do not agree, you must cease use of the app immediately.
            </p>
          </section>

          <section className="mb-10">
            <h3 className="text-foreground mb-3 text-xl font-semibold">2. Intellectual Property</h3>
            <p className="text-muted-foreground leading-relaxed">
              All content, features, and functionality (including but not limited to text, graphics,
              logos, and software) are the exclusive property of Glas Future Ltd t/a Dulra and are
              protected by Irish and international copyright laws.
            </p>
          </section>

          <section className="mb-10">
            <h3 className="text-foreground mb-3 text-xl font-semibold">3. User Conduct</h3>
            <p className="text-muted-foreground mb-3 leading-relaxed">You agree not to:</p>
            <ul className="text-muted-foreground list-disc space-y-2 pl-6 leading-relaxed">
              <li>Decompile or reverse engineer any part of the app.</li>
              <li>Use the app for any illegal or unauthorized purpose.</li>
              <li>Attempt to interfere with the proper working of the service.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h3 className="text-foreground mb-3 text-xl font-semibold">4. App Store Terms</h3>
            <p className="text-muted-foreground leading-relaxed">
              You acknowledge that these Terms are between you and Glas Future Ltd only, and not
              with Apple Inc. However, Apple and its subsidiaries are third-party beneficiaries of
              these Terms and have the right to enforce them against you.
            </p>
          </section>

          <section className="mb-10">
            <h3 className="text-foreground mb-3 text-xl font-semibold">
              5. Limitation of Liability
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, Glas Future Ltd t/a Dulra shall not be liable
              for any indirect, incidental, or consequential damages resulting from your use or
              inability to use the app.
            </p>
          </section>

          <section className="mb-10">
            <h3 className="text-foreground mb-3 text-xl font-semibold">6. Governing Law</h3>
            <p className="text-muted-foreground leading-relaxed">
              These terms are governed by and construed in accordance with the laws of Ireland. Any
              disputes shall be subject to the exclusive jurisdiction of the Irish courts.
            </p>
          </section>
        </div>

        {/* CONTACT */}
        <div id="contact" className="mt-16 scroll-mt-24">
          <h2 className="text-foreground border-border mb-6 border-b pb-3 text-3xl font-bold">
            Contact &amp; Company Information
          </h2>
          <div className="border-border bg-muted/50 rounded-lg border p-6">
            <p className="text-foreground font-semibold">Glas Future Ltd t/a Dulra</p>
            <p className="text-muted-foreground">Company Reg: 696508</p>
            <p className="text-muted-foreground">
              Registered Office: RDI Hub, Killorglin, Co. Kerry, Ireland
            </p>
            <p className="text-muted-foreground mt-2">
              Email:{' '}
              <a
                href="mailto:support@dulra.com"
                className="text-green-600 hover:underline dark:text-green-400"
              >
                support@dulra.com
              </a>
            </p>
          </div>
        </div>

        <div className="border-border mt-16 border-t pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <Link
              href="/support"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Need help? Visit Support →
            </Link>
            <p className="text-muted-foreground">© Dulra 2026</p>
          </div>
        </div>
      </main>
    </div>
  )
}
