"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  Clock,
  FileText,
  Map,
  MoreVertical,
  Edit,
  Trash2,
  Share2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import {
  PHASE_COLORS,
  HEALTH_STATUS_COLORS,
  STEP_STATUS_COLORS,
  WORKFLOW_STEPS,
} from "@/types";

// Mock project data
const mockProject = {
  id: "1",
  name: "Ballymore Wind Farm EcIA",
  site_code: "BWF-2024-001",
  survey_type: "Ecological Impact Assessment",
  status: "active" as const,
  current_phase: "desk_research" as const,
  health_status: "on_track" as const,
  expected_start_date: "2024-01-15",
  expected_end_date: "2024-04-30",
  actual_start_date: "2024-01-15",
  budget_days: 25,
  grid_reference: "N 23456 12345",
  progress: 35,
  client: { id: "c1", name: "Energia Renewables" },
  members: [
    { id: "m1", full_name: "Eoin Murphy", avatar_url: null, role: "lead" as const },
    { id: "m2", full_name: "Sarah O'Brien", avatar_url: null, role: "surveyor" as const },
    { id: "m3", full_name: "Michael Walsh", avatar_url: null, role: "analyst" as const },
  ],
  workflow_steps: WORKFLOW_STEPS.map((step, index) => ({
    id: `step-${index + 1}`,
    ...step,
    status: index < 3 ? "approved" as const : index === 3 ? "in_progress" as const : "pending" as const,
  })),
};

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  // In real app, fetch project by ID
  const project = mockProject;
  const phaseColors = PHASE_COLORS[project.current_phase];
  const healthColors = HEALTH_STATUS_COLORS[project.health_status];

  // Group workflow steps by phase
  const stepsByPhase = {
    desk_research: project.workflow_steps.filter((s) => s.phase === "desk_research"),
    field_research: project.workflow_steps.filter((s) => s.phase === "field_research"),
    reporting: project.workflow_steps.filter((s) => s.phase === "reporting"),
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              <div
                className={cn("h-3 w-3 rounded-full", healthColors.bg)}
                title={healthColors.label}
              />
            </div>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
              <span>{project.site_code}</span>
              <span>•</span>
              <span>{project.survey_type}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(phaseColors.bg, phaseColors.text, phaseColors.border)}
          >
            {project.current_phase.replace("_", " ")}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-primary/10 p-3">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Progress</p>
              <div className="flex items-center gap-2">
                <Progress value={project.progress} className="h-2 w-20" />
                <span className="font-semibold">{project.progress}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-blue-500/10 p-3">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Due Date</p>
              <p className="font-semibold">
                {project.expected_end_date
                  ? formatDate(project.expected_end_date)
                  : "Not set"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-green-500/10 p-3">
              <MapPin className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Grid Reference</p>
              <p className="font-semibold">{project.grid_reference || "Not set"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-purple-500/10 p-3">
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Team Members</p>
              <p className="font-semibold">{project.members.length} members</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="desk-research">Desk Research</TabsTrigger>
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Project Info */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium">{project.client?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="secondary" className="capitalize">
                      {project.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Start Date</p>
                    <p className="font-medium">
                      {project.actual_start_date
                        ? formatDate(project.actual_start_date)
                        : "Not started"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Budget</p>
                    <p className="font-medium">
                      {project.budget_days ? `${project.budget_days} days` : "Not set"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Team Members */}
            <Card>
              <CardHeader>
                <CardTitle>Team</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {project.members.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback>
                          {member.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.full_name}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {member.role}
                        </p>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" size="sm">
                    Manage Team
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Workflow Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {(["desk_research", "field_research", "reporting"] as const).map(
                  (phase) => {
                    const steps = stepsByPhase[phase];
                    const completed = steps.filter((s) => s.status === "approved").length;
                    const total = steps.length;
                    const colors = PHASE_COLORS[phase];

                    return (
                      <div key={phase}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn(colors.bg, colors.text, colors.border)}
                            >
                              {phase.replace("_", " ")}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {completed}/{total} steps completed
                            </span>
                          </div>
                          <span className="text-sm font-medium">
                            {Math.round((completed / total) * 100)}%
                          </span>
                        </div>
                        <Progress
                          value={(completed / total) * 100}
                          className="h-2"
                        />
                      </div>
                    );
                  }
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>16-Step Workflow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {(["desk_research", "field_research", "reporting"] as const).map(
                  (phase) => {
                    const steps = stepsByPhase[phase];
                    const colors = PHASE_COLORS[phase];

                    return (
                      <div key={phase}>
                        <div className="flex items-center gap-2 mb-4">
                          <Badge
                            variant="outline"
                            className={cn(colors.bg, colors.text, colors.border)}
                          >
                            {phase.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="space-y-2 pl-4 border-l-2 border-muted">
                          {steps.map((step) => {
                            const statusColors = STEP_STATUS_COLORS[step.status];
                            return (
                              <div
                                key={step.id}
                                className={cn(
                                  "flex items-center justify-between p-3 rounded-lg transition-colors",
                                  statusColors.bg
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-muted-foreground">
                                    {step.number}.
                                  </span>
                                  <span className={cn("font-medium", statusColors.text)}>
                                    {step.name}
                                  </span>
                                </div>
                                <Badge variant="secondary" className="capitalize">
                                  {step.status.replace("_", " ")}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                        {phase !== "reporting" && <Separator className="my-6" />}
                      </div>
                    );
                  }
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="desk-research">
          <Card>
            <CardHeader>
              <CardTitle>Desk Research</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Start Desk Research</h3>
                <p className="text-muted-foreground max-w-md mb-4">
                  Search external databases for designated sites, species records, and
                  environmental data within your project boundary.
                </p>
                <Button asChild>
                  <Link href={`/projects/${projectId}/desk-research`}>
                    Begin Research
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map">
          <Card>
            <CardHeader>
              <CardTitle>Project Map</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Map className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Map View Coming Soon</h3>
                <p className="text-muted-foreground max-w-md">
                  View and edit your project boundary, habitat polygons, and species
                  observation points on an interactive map.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Reports Yet</h3>
                <p className="text-muted-foreground max-w-md mb-4">
                  Reports will be available once desk research and field surveys are
                  completed.
                </p>
                <Button disabled>Generate Report</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
