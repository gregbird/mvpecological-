import { Leaf } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 text-primary-foreground">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/20">
            <Leaf className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold">Dulra</span>
        </div>

        <div className="space-y-6">
          <blockquote className="text-xl font-medium leading-relaxed">
            &ldquo;Dulra has transformed how we manage ecological projects.
            The desk research automation alone has saved us countless hours.&rdquo;
          </blockquote>
          <div>
            <p className="font-semibold">Dr. Sarah O&apos;Brien</p>
            <p className="text-primary-foreground/80">Senior Ecologist, EcoSurvey Ireland</p>
          </div>
        </div>

        <div className="text-sm text-primary-foreground/60">
          <p>Trusted by ecological consultancies across Ireland</p>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
