"use client";

import Link from "next/link";
import { MapPin, Calendar, Users } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import {
  PHASE_COLORS,
  HEALTH_STATUS_COLORS,
  type ProjectWithDetails,
} from "@/types";

interface ProjectCardProps {
  project: ProjectWithDetails;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const phaseColors = PHASE_COLORS[project.current_phase];
  const healthColors = HEALTH_STATUS_COLORS[project.health_status];

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {/* Health Status Indicator */}
                <div
                  className={cn("h-2 w-2 rounded-full", healthColors.bg)}
                  title={healthColors.label}
                />
                <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                  {project.name}
                </h3>
              </div>
              {project.site_code && (
                <p className="text-sm text-muted-foreground mt-1">
                  {project.site_code}
                </p>
              )}
            </div>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0",
                phaseColors.bg,
                phaseColors.text,
                phaseColors.border
              )}
            >
              {project.current_phase.replace("_", " ")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-2" />
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {project.client && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate max-w-[120px]">
                  {project.client.name}
                </span>
              </div>
            )}
            {project.expected_end_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(project.expected_end_date)}</span>
              </div>
            )}
          </div>

          {/* Team Members */}
          {project.members && project.members.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>{project.members.length} members</span>
              </div>
              <TooltipProvider>
                <div className="flex -space-x-2">
                  {project.members.slice(0, 4).map((member) => (
                    <Tooltip key={member.id}>
                      <TooltipTrigger>
                        <Avatar className="h-7 w-7 border-2 border-background">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-muted">
                            {member.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{member.full_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {member.role}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {project.members.length > 4 && (
                    <Avatar className="h-7 w-7 border-2 border-background">
                      <AvatarFallback className="text-xs bg-muted">
                        +{project.members.length - 4}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </TooltipProvider>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
