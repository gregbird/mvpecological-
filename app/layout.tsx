import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { RoleProvider } from '@/contexts/role-context'
import { DevModeButton } from '@/components/dev-mode-button'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Dulra - Ecological Project Management',
  description: 'End-to-end project management platform for ecological consultancies',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <RoleProvider>
            {children}
            <DevModeButton />
            <Toaster />
          </RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
