import * as React from 'react'
import { Leaf } from 'lucide-react'
import { ThemeToggle } from '@/components/layout/theme-toggle'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Theme Toggle - top right corner */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Left side - Branding */}
      <div className="bg-primary text-primary-foreground hidden flex-col justify-between p-12 lg:flex lg:w-1/2">
        <div className="flex items-center gap-2">
          <div className="bg-primary-foreground/20 flex h-10 w-10 items-center justify-center rounded-lg">
            <Leaf className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold">Dulra</span>
        </div>

        <div className="space-y-6">
          <blockquote className="text-xl leading-relaxed font-medium">
            &ldquo;Dulra has transformed how we manage ecological projects. The desk research
            automation alone has saved us countless hours.&rdquo;
          </blockquote>
          <div>
            <p className="font-semibold">Dr. Sarah O&apos;Brien</p>
            <p className="text-primary-foreground/80">Senior Ecologist, EcoSurvey Ireland</p>
          </div>
        </div>

        <div className="text-primary-foreground/60 text-sm">
          <p>Trusted by ecological consultancies across Ireland</p>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">{children}</div>
      </div>

      {/* Dev Mode Button is now global - see components/dev-mode-button.tsx */}
    </div>
  )
}
