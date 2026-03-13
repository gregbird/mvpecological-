'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface InviteDetails {
  id: string
  organization_id: string
  organization_name: string
  email: string
  role: string
  expires_at: string
}

const acceptInviteSchema = z
  .object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type AcceptInviteFormData = z.infer<typeof acceptInviteSchema>

function AcceptInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = React.useState(false)
  const [isLoadingInvite, setIsLoadingInvite] = React.useState(true)
  const [inviteDetails, setInviteDetails] = React.useState<InviteDetails | null>(null)
  const [inviteError, setInviteError] = React.useState<string | null>(null)

  const token = searchParams.get('token')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptInviteFormData>({
    resolver: zodResolver(acceptInviteSchema),
  })

  // Fetch invite details
  React.useEffect(() => {
    async function fetchInvite() {
      if (!token) {
        setInviteError('No invitation token provided')
        setIsLoadingInvite(false)
        return
      }

      try {
        const supabase = createClient()

        // Call the function to get invite details
        const { data, error } = await supabase.rpc('get_invite_by_token', {
          invite_token: token,
        })

        if (error) {
          throw error
        }

        if (!data || data.length === 0) {
          setInviteError('This invitation is invalid or has expired')
          return
        }

        setInviteDetails(data[0])
      } catch (err) {
        console.error('Error fetching invite:', err)
        setInviteError('Failed to load invitation details')
      } finally {
        setIsLoadingInvite(false)
      }
    }

    fetchInvite()
  }, [token])

  const onSubmit = async (data: AcceptInviteFormData) => {
    if (!inviteDetails || !token) return

    setIsLoading(true)
    try {
      // Call server-side API to create user + profile + accept invite
      const response = await fetch('/api/team/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          fullName: data.fullName,
          password: data.password,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Registration failed',
          description: result.error || 'Something went wrong',
        })
        return
      }

      // Auto-login after successful registration
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: inviteDetails.email,
        password: data.password,
      })

      if (signInError) {
        toast({
          title: 'Account created!',
          description: `You've joined ${inviteDetails.organization_name}. Please sign in.`,
        })
        router.push('/login')
        return
      }

      toast({
        title: 'Welcome to the team!',
        description: `You've joined ${inviteDetails.organization_name}.`,
      })
      router.push('/projects')
    } catch {
      toast({
        variant: 'destructive',
        title: 'Something went wrong',
        description: 'Please try again later.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state
  if (isLoadingInvite) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Error state - no token or invalid invite
  if (inviteError || !inviteDetails) {
    return (
      <>
        {/* Mobile Logo */}
        <div className="mb-8 flex items-center justify-center lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dulra-logo.jpg" alt="Dulra" className="h-10" />
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {inviteError || 'This invitation link is invalid or has expired.'}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <p className="text-muted-foreground text-center text-sm">
              Need a new invitation? Contact your organization admin.
            </p>
            <div className="flex gap-4">
              <Button asChild variant="outline">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Create organization</Link>
              </Button>
            </div>
          </CardFooter>
        </Card>
      </>
    )
  }

  // Valid invite - show registration form
  return (
    <>
      {/* Mobile Logo */}
      <div className="mb-8 flex items-center justify-center lg:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dulra-logo.jpg" alt="Dulra" className="h-10" />
      </div>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Join {inviteDetails.organization_name}</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join as a{' '}
            <span className="font-medium capitalize">{inviteDetails.role}</span>
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Invitation for</AlertTitle>
              <AlertDescription>{inviteDetails.email}</AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Your name"
                {...register('fullName')}
                disabled={isLoading}
              />
              {errors.fullName && (
                <p className="text-destructive text-sm">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={inviteDetails.email} disabled />
              <p className="text-muted-foreground text-xs">
                This email is linked to your invitation
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} disabled={isLoading} />
              {errors.password && (
                <p className="text-destructive text-sm">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword')}
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <p className="text-destructive text-sm">{errors.confirmPassword.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Accept invitation
            </Button>
            <p className="text-muted-foreground text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </>
  )
}

export default function AcceptInvitePage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-100 items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      }
    >
      <AcceptInviteContent />
    </React.Suspense>
  )
}
