import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Use — Dulra',
  description:
    'Terms governing your use of the Dulra platform operated by Glas Future Ltd t/a Dulra.',
}

export default function TermsPage() {
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
            Terms of Use
          </h1>
          <p className="text-muted-foreground text-sm">Last Updated: May 13, 2026</p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <section className="mb-10">
            <h2 className="text-foreground mb-3 text-xl font-semibold">1. Agreement to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By downloading or using the Dulra app, you agree to be bound by these Terms of Use and
              our Privacy Policy. If you do not agree, you must cease use of the app immediately.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-foreground mb-3 text-xl font-semibold">2. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content, features, and functionality (including but not limited to text, graphics,
              logos, and software) are the exclusive property of Glas Future Ltd t/a Dulra and are
              protected by Irish and international copyright laws.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-foreground mb-3 text-xl font-semibold">3. User Conduct</h2>
            <p className="text-muted-foreground mb-3 leading-relaxed">You agree not to:</p>
            <ul className="text-muted-foreground list-disc space-y-2 pl-6 leading-relaxed">
              <li>Decompile or reverse engineer any part of the app.</li>
              <li>Use the app for any illegal or unauthorized purpose.</li>
              <li>Attempt to interfere with the proper working of the service.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-foreground mb-3 text-xl font-semibold">4. App Store Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              You acknowledge that these Terms are between you and Glas Future Ltd only, and not
              with Apple Inc. However, Apple and its subsidiaries are third-party beneficiaries of
              these Terms and have the right to enforce them against you.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-foreground mb-3 text-xl font-semibold">
              5. Limitation of Liability
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, Glas Future Ltd t/a Dulra shall not be liable
              for any indirect, incidental, or consequential damages resulting from your use or
              inability to use the app.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-foreground mb-3 text-xl font-semibold">6. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These terms are governed by and construed in accordance with the laws of Ireland. Any
              disputes shall be subject to the exclusive jurisdiction of the Irish courts.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-foreground mb-3 text-xl font-semibold">7. Company Information</h2>
            <div className="border-border bg-muted/50 not-prose rounded-lg border p-6">
              <p className="text-foreground font-semibold">Glas Future Ltd t/a Dulra</p>
              <p className="text-muted-foreground">Company Reg: 696508</p>
              <p className="text-muted-foreground">
                Registered Office: RDI Hub, Killorglin, Co. Kerry, Ireland
              </p>
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
                href="/privacy"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy →
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
