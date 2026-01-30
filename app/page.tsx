'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  Leaf,
  Map,
  FileText,
  Users,
  CheckCircle,
  BarChart3,
  Shield,
  Zap,
  Star,
  Layers,
  ChevronDown,
} from 'lucide-react'

const sections = ['hero', 'features', 'testimonials', 'cta'] as const
type SectionId = (typeof sections)[number]

export default function Home() {
  const [activeSection, setActiveSection] = useState<SectionId>('hero')
  const containerRef = useRef<HTMLDivElement>(null)

  const scrollToSection = (id: SectionId) => {
    const element = document.getElementById(id)
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollPosition = container.scrollTop
      const windowHeight = window.innerHeight

      sections.forEach((section) => {
        const element = document.getElementById(section)
        if (element) {
          const { offsetTop } = element
          if (scrollPosition >= offsetTop - windowHeight / 2) {
            setActiveSection(section)
          }
        }
      })
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div
      ref={containerRef}
      className="h-screen snap-y snap-mandatory overflow-y-auto scroll-smooth"
      style={{ scrollBehavior: 'smooth' }}
    >
      {/* Navigation Dots */}
      <nav className="fixed top-1/2 right-6 z-50 hidden -translate-y-1/2 flex-col gap-3 md:flex">
        {sections.map((section) => (
          <button
            key={section}
            onClick={() => scrollToSection(section)}
            className={`h-3 w-3 rounded-full border-2 transition-all duration-300 ${
              activeSection === section
                ? 'scale-125 border-green-500 bg-green-500'
                : 'border-gray-400 bg-transparent hover:border-green-400'
            }`}
            aria-label={`Go to ${section}`}
          />
        ))}
      </nav>

      {/* Hero Section */}
      <HeroSection onScrollDown={() => scrollToSection('features')} />

      {/* Features Section */}
      <FeaturesSection />

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* CTA Section */}
      <CTASection />
    </div>
  )
}

function HeroSection({ onScrollDown }: { onScrollDown: () => void }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })

  return (
    <section
      id="hero"
      ref={ref}
      className="relative flex h-screen snap-start snap-always items-center justify-center overflow-hidden bg-white dark:bg-gray-950"
    >
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(34,197,94,0.15),rgba(255,255,255,0))]" />
        <div className="absolute top-20 -left-40 h-96 w-96 rounded-full bg-green-200/30 blur-3xl" />
        <div className="absolute -right-40 bottom-20 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />
      </div>

      {/* Header */}
      <header className="absolute top-0 right-0 left-0 z-40">
        <div className="container mx-auto flex items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/25">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Dulra
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-gray-600">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg shadow-green-500/25">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-600" />
            </span>
            Trusted by 50+ ecological consultancies in Ireland
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6 text-5xl leading-tight font-bold tracking-tight text-gray-900 md:text-6xl lg:text-7xl dark:text-white"
          >
            Ecological Projects,{' '}
            <span className="bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
              Simplified
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mb-10 max-w-2xl text-lg text-gray-600 md:text-xl dark:text-gray-400"
          >
            From Desk Research to Automated Reporting.{' '}
            <span className="font-semibold text-gray-900 dark:text-white">Reduce time by 30%.</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link href="/register">
              <Button
                size="lg"
                className="group h-14 gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-8 text-base font-semibold shadow-xl shadow-green-500/25"
              >
                Start Free Trial
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="h-14 rounded-xl border-gray-300 px-8 text-base font-semibold"
            >
              Watch Demo
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500"
          >
            {['14-day free trial', 'No credit card', 'GDPR compliant'].map((text) => (
              <div key={text} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>{text}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        onClick={onScrollDown}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-400 hover:text-gray-600"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
        >
          <ChevronDown className="h-8 w-8" />
        </motion.div>
      </motion.button>
    </section>
  )
}

function FeaturesSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })

  const features = [
    {
      icon: Users,
      title: 'Project Dashboard',
      description: '16-step workflows, team assignments, real-time updates',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Map,
      title: 'GIS & Desk Research',
      description: 'NPWS/GBIF databases, shapefiles, AI-powered gathering',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: Leaf,
      title: 'Field Surveys',
      description: 'GPS tracking, photo capture, offline support',
      gradient: 'from-emerald-500 to-teal-500',
    },
    {
      icon: FileText,
      title: 'AI Reporting',
      description: 'Auto-generate reports, preserve ecologist expertise',
      gradient: 'from-purple-500 to-pink-500',
    },
  ]

  const stats = [
    { value: '30%', label: 'Time saved', icon: BarChart3 },
    { value: '50+', label: 'Consultancies', icon: Users },
    { value: '10K+', label: 'Projects', icon: Layers },
    { value: '99.9%', label: 'Uptime', icon: Shield },
  ]

  return (
    <section
      id="features"
      ref={ref}
      className="flex min-h-screen snap-start snap-always flex-col justify-center bg-gray-50 py-20 dark:bg-gray-900"
    >
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <Zap className="h-4 w-4" />
            Features
          </div>
          <h2 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl lg:text-5xl dark:text-white">
            Everything you need
          </h2>
          <p className="mx-auto max-w-xl text-gray-600 dark:text-gray-400">
            From project planning to final reports, Dulra covers every step.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="mb-20 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50, y: 20 }}
              animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
              transition={{
                duration: 0.6,
                delay: i * 0.15,
                ease: [0.25, 0.4, 0.25, 1],
              }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-xl dark:border-gray-800 dark:bg-gray-950"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{
                  duration: 0.4,
                  delay: i * 0.15 + 0.1,
                  ease: [0.25, 0.4, 0.25, 1],
                }}
                className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} text-white shadow-lg`}
              >
                <feature.icon className="h-6 w-6" />
              </motion.div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-2 gap-8 lg:grid-cols-4"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <stat.icon className="h-6 w-6" />
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function TestimonialsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })

  const testimonials = [
    {
      quote: 'Dulra has transformed how we handle desk research. What took days now takes hours.',
      author: 'Dr. Sarah Murphy',
      role: 'Senior Ecologist, EcoServ Ireland',
    },
    {
      quote:
        'The AI reporting feature is a game-changer. It respects our expertise while saving time.',
      author: "James O'Connor",
      role: 'Director, GreenField Consulting',
    },
    {
      quote: 'Finally, a tool built by people who understand ecological consulting workflows.',
      author: 'Emma Walsh',
      role: 'Principal Ecologist, BioConsult',
    },
  ]

  return (
    <section
      id="testimonials"
      ref={ref}
      className="flex min-h-screen snap-start snap-always flex-col justify-center bg-white py-20 dark:bg-gray-950"
    >
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <Star className="h-4 w-4" />
            Testimonials
          </div>
          <h2 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl lg:text-5xl dark:text-white">
            Loved by ecologists
          </h2>
        </motion.div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {testimonials.map((testimonial, i) => (
            <motion.div
              key={testimonial.author}
              initial={{
                opacity: 0,
                x: i === 0 ? -60 : i === 2 ? 60 : 0,
                y: i === 1 ? 40 : 0,
                scale: 0.9,
              }}
              animate={isInView ? { opacity: 1, x: 0, y: 0, scale: 1 } : {}}
              transition={{
                duration: 0.7,
                delay: i * 0.2,
                ease: [0.25, 0.4, 0.25, 1],
              }}
              whileHover={{
                scale: 1.03,
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                transition: { duration: 0.2 },
              }}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-4 flex gap-1">
                {[...Array(5)].map((_, j) => (
                  <motion.div
                    key={j}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{
                      duration: 0.3,
                      delay: i * 0.2 + j * 0.05 + 0.2,
                      ease: 'easeOut',
                    }}
                  >
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  </motion.div>
                ))}
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ duration: 0.5, delay: i * 0.2 + 0.4 }}
                className="mb-6 text-gray-600 dark:text-gray-400"
              >
                &ldquo;{testimonial.quote}&rdquo;
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.2 + 0.6 }}
              >
                <div className="font-semibold text-gray-900 dark:text-white">
                  {testimonial.author}
                </div>
                <div className="text-sm text-gray-500">{testimonial.role}</div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTASection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })

  return (
    <section
      id="cta"
      ref={ref}
      className="flex min-h-screen snap-start snap-always flex-col justify-center bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 py-20"
    >
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h2 className="mb-6 text-4xl font-bold text-white md:text-5xl lg:text-6xl">
            Ready to streamline your ecological projects?
          </h2>
          <p className="mb-10 text-xl text-green-100">
            Join 50+ consultancies already saving time with Dulra.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <Button
                size="lg"
                className="h-14 rounded-xl bg-white px-8 text-base font-semibold text-green-600 shadow-xl hover:bg-green-50"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="h-14 rounded-xl border-white/30 px-8 text-base font-semibold text-white hover:bg-white/10"
            >
              Talk to Sales
            </Button>
          </div>

          {/* Footer Links */}
          <div className="mt-20 flex flex-wrap items-center justify-center gap-6 text-sm text-green-100/80">
            <Link href="/privacy" className="hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms of Service
            </Link>
            <Link href="/contact" className="hover:text-white">
              Contact
            </Link>
          </div>
          <p className="mt-4 text-sm text-green-100/60">© 2026 Dulra. All rights reserved.</p>
        </motion.div>
      </div>
    </section>
  )
}
