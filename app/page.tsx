import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Leaf, Map, FileText, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="h-8 w-8 text-green-600" />
            <span className="text-2xl font-bold">Dulra</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Ecological Project Management,{" "}
            <span className="text-green-600">Simplified</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Dulra streamlines the entire ecological project lifecycle—from Desk
            Research and Field Surveys to Automated Reporting. Reduce time and
            effort by 30%.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline">
                View Demo
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
          <FeatureCard
            icon={<Users className="h-10 w-10 text-green-600" />}
            title="Project Dashboard"
            description="Track all projects with 16-step workflows, team assignments, and real-time status updates."
          />
          <FeatureCard
            icon={<Map className="h-10 w-10 text-green-600" />}
            title="GIS & Desk Research"
            description="Import shapefiles, search NPWS/GBIF databases, and AI-powered data gathering."
          />
          <FeatureCard
            icon={<Leaf className="h-10 w-10 text-green-600" />}
            title="Field Surveys"
            description="Digital survey forms with GPS tracking, photo capture, and offline support."
          />
          <FeatureCard
            icon={<FileText className="h-10 w-10 text-green-600" />}
            title="AI Reporting"
            description="Auto-generate professional reports with AI assistance while preserving ecologist opinions."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>© 2026 Dulra. Built for ecological consultancies.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
