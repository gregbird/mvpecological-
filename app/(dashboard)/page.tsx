"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { ProjectCard } from "@/components/dashboard/project-card";
import { StatusFilter, type FilterState } from "@/components/dashboard/status-filter";
import type { ProjectWithDetails } from "@/types";

// Mock data - will be replaced with actual data from Supabase
const mockStats = {
  totalProjects: 12,
  activeProjects: 8,
  atRiskProjects: 2,
  completedThisMonth: 3,
};

const mockProjects: ProjectWithDetails[] = [
  {
    id: "1",
    name: "Ballymore Wind Farm EcIA",
    site_code: "BWF-2024-001",
    status: "active",
    current_phase: "desk_research",
    health_status: "on_track",
    expected_start_date: "2024-01-15",
    expected_end_date: "2024-04-30",
    progress: 35,
    client: { id: "c1", name: "Energia Renewables" },
    members: [
      { id: "m1", full_name: "Eoin Murphy", avatar_url: null, role: "lead" },
      { id: "m2", full_name: "Sarah O'Brien", avatar_url: null, role: "surveyor" },
      { id: "m3", full_name: "Michael Walsh", avatar_url: null, role: "analyst" },
    ],
  },
  {
    id: "2",
    name: "Dublin Port Expansion AA",
    site_code: "DPE-2024-002",
    status: "active",
    current_phase: "field_research",
    health_status: "at_risk",
    expected_start_date: "2024-01-01",
    expected_end_date: "2024-03-15",
    progress: 65,
    client: { id: "c2", name: "Dublin Port Company" },
    members: [
      { id: "m1", full_name: "Eoin Murphy", avatar_url: null, role: "lead" },
      { id: "m4", full_name: "John Kelly", avatar_url: null, role: "surveyor" },
    ],
  },
  {
    id: "3",
    name: "Galway Solar Farm Screening",
    site_code: "GSF-2024-003",
    status: "active",
    current_phase: "reporting",
    health_status: "on_track",
    expected_start_date: "2024-02-01",
    expected_end_date: "2024-03-30",
    progress: 85,
    client: { id: "c3", name: "SSE Renewables" },
    members: [
      { id: "m2", full_name: "Sarah O'Brien", avatar_url: null, role: "lead" },
    ],
  },
  {
    id: "4",
    name: "Cork Harbour Marina NIS",
    site_code: "CHM-2024-004",
    status: "active",
    current_phase: "desk_research",
    health_status: "overdue",
    expected_start_date: "2023-12-01",
    expected_end_date: "2024-02-28",
    progress: 20,
    client: { id: "c4", name: "Cork County Council" },
    members: [
      { id: "m3", full_name: "Michael Walsh", avatar_url: null, role: "lead" },
      { id: "m5", full_name: "Emma Ryan", avatar_url: null, role: "analyst" },
      { id: "m6", full_name: "Liam O'Connor", avatar_url: null, role: "surveyor" },
      { id: "m7", full_name: "Aoife Murphy", avatar_url: null, role: "viewer" },
      { id: "m8", full_name: "Sean Brennan", avatar_url: null, role: "reviewer" },
    ],
  },
  {
    id: "5",
    name: "Limerick Housing Development",
    site_code: "LHD-2024-005",
    status: "draft",
    current_phase: "desk_research",
    health_status: "on_track",
    expected_start_date: null,
    expected_end_date: null,
    progress: 0,
    client: { id: "c5", name: "Private Developer" },
    members: [],
  },
  {
    id: "6",
    name: "Kerry Coastal Walk EcIA",
    site_code: "KCW-2024-006",
    status: "active",
    current_phase: "field_research",
    health_status: "on_track",
    expected_start_date: "2024-02-15",
    expected_end_date: "2024-05-30",
    progress: 45,
    client: { id: "c6", name: "Kerry County Council" },
    members: [
      { id: "m4", full_name: "John Kelly", avatar_url: null, role: "lead" },
      { id: "m2", full_name: "Sarah O'Brien", avatar_url: null, role: "surveyor" },
    ],
  },
];

export default function DashboardPage() {
  const [filters, setFilters] = React.useState<FilterState>({
    status: [],
    phase: [],
    health: [],
  });

  // Filter projects based on selected filters
  const filteredProjects = mockProjects.filter((project) => {
    if (filters.status.length > 0 && !filters.status.includes(project.status)) {
      return false;
    }
    if (filters.phase.length > 0 && !filters.phase.includes(project.current_phase)) {
      return false;
    }
    if (filters.health.length > 0 && !filters.health.includes(project.health_status)) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your ecological projects
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={mockStats} />

      {/* Projects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Projects</h2>
          <StatusFilter filters={filters} onFiltersChange={setFilters} />
        </div>

        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
            <p className="text-muted-foreground">No projects match your filters</p>
            <Button
              variant="link"
              onClick={() => setFilters({ status: [], phase: [], health: [] })}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}

        {/* View All Link */}
        <div className="flex justify-center pt-4">
          <Button variant="outline" asChild>
            <Link href="/projects">View All Projects</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
