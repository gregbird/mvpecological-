import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Mail, MapPin, Building2, FileText, MessageCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Support — Dulra',
  description:
    'Get help with Dulra. Contact information, frequently asked questions, and support resources for Glas Future Ltd t/a Dulra.',
}

export default function SupportPage() {
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
            Support
          </h1>
          <p className="text-muted-foreground text-lg">
            We&rsquo;re here to help. Reach out and we&rsquo;ll get back to you as soon as possible.
          </p>
        </div>

        {/* Primary contact card */}
        <div className="mb-12 rounded-2xl border border-green-200 bg-linear-to-br from-green-50 to-emerald-50 p-8 dark:border-green-800 dark:from-green-950/40 dark:to-emerald-950/40">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600 text-white">
              <Mail className="h-5 w-5" />
            </div>
            <h2 className="text-foreground text-2xl font-semibold">Get in touch</h2>
          </div>
          <p className="text-muted-foreground mb-4">
            For all support requests, questions, bug reports, or feedback, email us at:
          </p>
          <a
            href="mailto:support@dulra.com"
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-green-500/25 transition-colors hover:bg-green-700"
          >
            <Mail className="h-5 w-5" />
            support@dulra.com
          </a>
          <p className="text-muted-foreground mt-4 text-sm">
            Typical response time: within 1–2 business days.
          </p>
        </div>

        {/* FAQ */}
        <section className="mb-12">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
              <MessageCircle className="h-5 w-5" />
            </div>
            <h2 className="text-foreground text-2xl font-semibold">Frequently asked questions</h2>
          </div>

          <div className="space-y-4">
            <FaqItem question="What is Dulra?">
              Dulra is an end-to-end project management platform for ecological consultancies in
              Ireland. It manages projects through desk research, field surveys, and reporting
              phases, with integrations to Irish and EU biodiversity databases (NPWS, GBIF, NBDC,
              EPA, Catchments.ie).
            </FaqItem>

            <FaqItem question="How do I reset my password?">
              On the sign-in screen, tap &ldquo;Forgot password&rdquo; and enter the email address
              associated with your account. You&rsquo;ll receive a reset link within a few minutes.
              If it doesn&rsquo;t arrive, check your spam folder or email us directly.
            </FaqItem>

            <FaqItem question="How do I delete my account and data?">
              Email us at{' '}
              <a
                href="mailto:support@dulra.com"
                className="text-green-600 hover:underline dark:text-green-400"
              >
                support@dulra.com
              </a>{' '}
              from the address registered on your account and request deletion. Under GDPR, we will
              erase your personal data within 30 days and confirm completion by email.
            </FaqItem>

            <FaqItem question="Where is my data stored?">
              Your data is stored on EU-based infrastructure (Supabase and associated cloud
              providers). For full details on processing and third parties, see our{' '}
              <Link href="/privacy" className="text-green-600 hover:underline dark:text-green-400">
                Privacy Policy
              </Link>
              .
            </FaqItem>

            <FaqItem question="Do you offer team or enterprise plans?">
              Yes. Dulra is built for consultancy teams of all sizes. Email{' '}
              <a
                href="mailto:support@dulra.com"
                className="text-green-600 hover:underline dark:text-green-400"
              >
                support@dulra.com
              </a>{' '}
              and let us know your team size and use case — we&rsquo;ll get back to you with
              options.
            </FaqItem>

            <FaqItem question="I found a bug — how do I report it?">
              Send us an email at{' '}
              <a
                href="mailto:support@dulra.com"
                className="text-green-600 hover:underline dark:text-green-400"
              >
                support@dulra.com
              </a>{' '}
              with a short description, steps to reproduce, and (if possible) a screenshot or screen
              recording. Include your device model and OS version so we can investigate quickly.
            </FaqItem>
          </div>
        </section>

        {/* Resources */}
        <section className="mb-12">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600 text-white">
              <FileText className="h-5 w-5" />
            </div>
            <h2 className="text-foreground text-2xl font-semibold">Legal &amp; resources</h2>
          </div>
          <ul className="space-y-2">
            <li>
              <Link
                href="/privacy"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 transition-colors"
              >
                → Privacy Policy &amp; Terms of Use
              </Link>
            </li>
            <li>
              <Link
                href="/"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 transition-colors"
              >
                → Product home
              </Link>
            </li>
          </ul>
        </section>

        {/* Company info */}
        <section className="mb-12">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600 text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <h2 className="text-foreground text-2xl font-semibold">Company information</h2>
          </div>
          <div className="border-border bg-muted/50 rounded-lg border p-6">
            <p className="text-foreground font-semibold">Glas Future Ltd t/a Dulra</p>
            <p className="text-muted-foreground">Company Reg: 696508</p>
            <div className="text-muted-foreground mt-2 flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>RDI Hub, Killorglin, Co. Kerry, Ireland</span>
            </div>
            <div className="text-muted-foreground mt-2 flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" />
              <a
                href="mailto:support@dulra.com"
                className="text-green-600 hover:underline dark:text-green-400"
              >
                support@dulra.com
              </a>
            </div>
          </div>
        </section>

        <div className="border-border mt-16 border-t pt-8">
          <p className="text-muted-foreground text-center text-sm">© Dulra 2026</p>
        </div>
      </main>
    </div>
  )
}

function FaqItem({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <details className="border-border bg-card group rounded-lg border p-5 transition-shadow open:shadow-md">
      <summary className="text-foreground flex cursor-pointer items-center justify-between gap-4 font-semibold marker:hidden">
        <span>{question}</span>
        <span className="text-muted-foreground text-xl transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="text-muted-foreground mt-3 leading-relaxed">{children}</div>
    </details>
  )
}
