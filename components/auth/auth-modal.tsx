'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Leaf, Loader2, X, ArrowLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

// Schemas
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    organizationName: z.string().min(2, 'Organization name is required'),
    role: z.enum([
      'admin',
      'senior_ecologist',
      'field_ecologist',
      'gis_specialist',
      'junior_ecologist',
    ]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type LoginFormData = z.infer<typeof loginSchema>
type RegisterFormData = z.infer<typeof registerSchema>

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'login' | 'register'
}

export function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = React.useState<'login' | 'register'>(initialMode)

  React.useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4"
          >
            <div className="relative overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Header with Logo */}
              <div className="bg-linear-to-br from-green-500 to-emerald-600 px-8 pt-12 pb-8 text-center text-white">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm"
                >
                  <Leaf className="h-8 w-8" />
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-bold"
                >
                  {mode === 'login' ? 'Welcome back' : 'Get started'}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-1 text-green-100"
                >
                  {mode === 'login' ? 'Sign in to your account' : 'Create your Dulra account'}
                </motion.p>
              </div>

              {/* Form Content */}
              <div className="p-8">
                <AnimatePresence mode="wait">
                  {mode === 'login' ? (
                    <LoginForm
                      key="login"
                      onSwitchMode={() => setMode('register')}
                      onSuccess={onClose}
                    />
                  ) : (
                    <RegisterForm
                      key="register"
                      onSwitchMode={() => setMode('login')}
                      onSuccess={onClose}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function LoginForm({
  onSwitchMode,
  onSuccess,
}: {
  onSwitchMode: () => void
  onSuccess: () => void
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: error.message,
        })
        return
      }

      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      })
      onSuccess()
      router.push('/dashboard')
      router.refresh()
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

  return (
    <motion.form
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          placeholder="eoin@ecology.ie"
          {...register('email')}
          disabled={isLoading}
          className="h-12"
        />
        {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Password</Label>
          <button type="button" className="text-sm text-green-600 hover:text-green-700">
            Forgot password?
          </button>
        </div>
        <Input
          id="login-password"
          type="password"
          {...register('password')}
          disabled={isLoading}
          className="h-12"
        />
        {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
      </div>

      <Button
        type="submit"
        className="h-12 w-full bg-linear-to-r from-green-600 to-emerald-600 text-base font-semibold"
        disabled={isLoading}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign in
      </Button>

      <p className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={onSwitchMode}
          className="font-medium text-green-600 hover:text-green-700"
        >
          Sign up
        </button>
      </p>
    </motion.form>
  )
}

function RegisterForm({
  onSwitchMode,
  onSuccess,
}: {
  onSwitchMode: () => void
  onSuccess: () => void
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = React.useState(false)
  const [step, setStep] = React.useState(1)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'junior_ecologist',
    },
  })

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            organization_name: data.organizationName,
            role: data.role,
          },
        },
      })

      if (authError) {
        toast({
          variant: 'destructive',
          title: 'Registration failed',
          description: authError.message,
        })
        return
      }

      if (authData.user) {
        toast({
          title: 'Account created!',
          description: 'Please check your email to verify your account.',
        })
        onSuccess()
        router.push('/login')
      }
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

  return (
    <motion.form
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
    >
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Eoin Murphy"
                {...register('fullName')}
                disabled={isLoading}
                className="h-12"
              />
              {errors.fullName && <p className="text-sm text-red-500">{errors.fullName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-email">Email</Label>
              <Input
                id="register-email"
                type="email"
                placeholder="eoin@ecology.ie"
                {...register('email')}
                disabled={isLoading}
                className="h-12"
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization</Label>
              <Input
                id="organizationName"
                placeholder="EcoSurvey Ireland"
                {...register('organizationName')}
                disabled={isLoading}
                className="h-12"
              />
              {errors.organizationName && (
                <p className="text-sm text-red-500">{errors.organizationName.message}</p>
              )}
            </div>

            <Button
              type="button"
              onClick={() => setStep(2)}
              className="h-12 w-full bg-linear-to-r from-green-600 to-emerald-600 text-base font-semibold"
            >
              Continue
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mb-2 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                onValueChange={(value) => setValue('role', value as RegisterFormData['role'])}
                defaultValue="junior_ecologist"
                disabled={isLoading}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="senior_ecologist">Senior Ecologist</SelectItem>
                  <SelectItem value="field_ecologist">Field Ecologist</SelectItem>
                  <SelectItem value="gis_specialist">GIS Specialist</SelectItem>
                  <SelectItem value="junior_ecologist">Junior Ecologist</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-password">Password</Label>
              <Input
                id="register-password"
                type="password"
                {...register('password')}
                disabled={isLoading}
                className="h-12"
              />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword')}
                disabled={isLoading}
                className="h-12"
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="h-12 w-full bg-linear-to-r from-green-600 to-emerald-600 text-base font-semibold"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create account
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchMode}
          className="font-medium text-green-600 hover:text-green-700"
        >
          Sign in
        </button>
      </p>
    </motion.form>
  )
}
