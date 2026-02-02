# Assessor Role Specification

**Document Type:** Role Definition & Permissions
**Version:** 1.0
**Date:** February 2026
**Status:** Draft

---

## Table of Contents

1. [Overview](#overview)
2. [Role Definition](#role-definition)
3. [Permission Matrix](#permission-matrix)
4. [Workflow Access](#workflow-access)
5. [User Interface Considerations](#user-interface-considerations)
6. [Implementation Notes](#implementation-notes)

---

## Overview

### Purpose

This document defines the **Assessor** role for the Dulra platform. The Assessor is the primary working role for ecological consultants who conduct field research, data collection, and report writing.

### Background

The Assessor role consolidates multiple user personas from the USER_PERSONAS document:

| User Persona | Maps to Assessor |
|--------------|------------------|
| Field Ecologist (Conor) | ✅ Primary match |
| GIS Specialist (Lisa) | ✅ Partial match |
| Junior Ecologist (Emma) | ✅ Primary match |

### Role Hierarchy

```
┌─────────────────────────────────────────────────────┐
│                      ADMIN                          │
│  Full system access, team management, approvals     │
├─────────────────────────────────────────────────────┤
│                    ASSESSOR                         │
│  Field work, data entry, report writing             │
├─────────────────────────────────────────────────────┤
│                     CLIENT                          │
│  Read-only access to assigned projects              │
└─────────────────────────────────────────────────────┘
```

---

## Role Definition

### Description

**Assessor** = Ecological consultant who actively works on projects, conducting desk research, field surveys, habitat mapping, and report preparation.

### Key Responsibilities

1. **Desk Research Phase**
   - Define site boundaries on GIS map
   - Search external databases (NPWS, GBIF, NBDC, EPA)
   - Save and manage research findings
   - Review designated sites and species records

2. **Field Research Phase**
   - Create and conduct field surveys
   - Record species observations with GPS and photos
   - Draw habitat polygons using Fossitt classification
   - Add target notes for features of interest
   - Work offline and sync when connected

3. **Reporting Phase**
   - View and edit AI-generated draft reports
   - Add ecological opinions and commentary
   - Prepare data for quality review
   - **Cannot** approve or submit final reports (Admin only)

### What Assessor Can Do

- ✅ View projects they are assigned to
- ✅ Draw and edit site boundaries
- ✅ Search and save external data (NPWS, GBIF, NBDC, EPA)
- ✅ Create field surveys
- ✅ Add species observations
- ✅ Draw habitat polygons
- ✅ Add target notes
- ✅ Upload photos
- ✅ Mark observations as "uncertain" for senior review
- ✅ Edit report drafts
- ✅ View their own work history

### What Assessor Cannot Do

- ❌ Create new projects
- ❌ Delete projects
- ❌ Edit project metadata (name, client, deadline)
- ❌ Manage team members
- ❌ Approve reports (Quality Review step)
- ❌ Submit final reports
- ❌ View audit trail
- ❌ View timesheets
- ❌ Access system settings

---

## Permission Matrix

### Detailed Permission Table

| Permission Category | Permission | Admin | Assessor | Client |
|---------------------|------------|-------|----------|--------|
| **Project Management** |
| | View assigned projects | ✅ | ✅ | ✅ |
| | View all projects | ✅ | ❌ | ❌ |
| | Create project | ✅ | ❌ | ❌ |
| | Edit project details | ✅ | ❌ | ❌ |
| | Delete project | ✅ | ❌ | ❌ |
| | Archive project | ✅ | ❌ | ❌ |
| **GIS & Mapping** |
| | View GIS map | ✅ | ✅ | ✅ |
| | Draw site boundary | ✅ | ✅ | ❌ |
| | Edit site boundary | ✅ | ✅ | ❌ |
| | Upload shapefiles | ✅ | ✅ | ❌ |
| | Add buffer zones | ✅ | ✅ | ❌ |
| | Toggle map layers | ✅ | ✅ | ✅ |
| **Data Gathering** |
| | Search NPWS | ✅ | ✅ | ❌ |
| | Search GBIF | ✅ | ✅ | ❌ |
| | Search NBDC | ✅ | ✅ | ❌ |
| | Search EPA | ✅ | ✅ | ❌ |
| | Save findings | ✅ | ✅ | ❌ |
| | Edit findings | ✅ | ✅ | ❌ |
| | Delete own findings | ✅ | ✅ | ❌ |
| | Delete others' findings | ✅ | ❌ | ❌ |
| **Field Surveys** |
| | Create survey | ✅ | ✅ | ❌ |
| | Edit survey | ✅ | ✅ | ❌ |
| | Delete survey | ✅ | ❌ | ❌ |
| | Add observations | ✅ | ✅ | ❌ |
| | Edit own observations | ✅ | ✅ | ❌ |
| | Delete own observations | ✅ | ✅ | ❌ |
| | Mark as uncertain | ✅ | ✅ | ❌ |
| | Upload photos | ✅ | ✅ | ❌ |
| **Habitat Mapping** |
| | Draw habitat polygons | ✅ | ✅ | ❌ |
| | Edit habitat polygons | ✅ | ✅ | ❌ |
| | Assign Fossitt codes | ✅ | ✅ | ❌ |
| | Delete habitat polygons | ✅ | ❌ | ❌ |
| **Target Notes** |
| | Add target notes | ✅ | ✅ | ❌ |
| | Edit own target notes | ✅ | ✅ | ❌ |
| | Delete own target notes | ✅ | ✅ | ❌ |
| | Verify target notes | ✅ | ❌ | ❌ |
| **Reporting** |
| | View AI draft | ✅ | ✅ | ❌ |
| | Edit report content | ✅ | ✅ | ❌ |
| | Add ecological opinion | ✅ | ✅ | ❌ |
| | Submit for review | ✅ | ✅ | ❌ |
| | Approve report | ✅ | ❌ | ❌ |
| | Final submission | ✅ | ❌ | ❌ |
| | Download report | ✅ | ✅ | ✅ |
| **Team & System** |
| | View team members | ✅ | ✅ | ❌ |
| | Manage team | ✅ | ❌ | ❌ |
| | View audit trail | ✅ | ❌ | ❌ |
| | View timesheets | ✅ | ❌ | ❌ |
| | System settings | ✅ | ❌ | ❌ |

### Permission Code Structure

```typescript
interface AssessorPermissions {
  // Project
  canViewAssignedProjects: true;
  canViewAllProjects: false;
  canCreateProject: false;
  canEditProject: false;
  canDeleteProject: false;

  // GIS & Mapping
  canViewGISMap: true;
  canDrawBoundary: true;
  canEditBoundary: true;
  canUploadShapefiles: true;
  canAddBufferZones: true;

  // Data Gathering
  canSearchExternalData: true;
  canSaveFindings: true;
  canEditFindings: true;
  canDeleteOwnFindings: true;
  canDeleteOthersFindings: false;

  // Field Surveys
  canCreateSurvey: true;
  canEditSurvey: true;
  canDeleteSurvey: false;
  canAddObservations: true;
  canEditOwnObservations: true;
  canDeleteOwnObservations: true;
  canMarkAsUncertain: true;
  canUploadPhotos: true;

  // Habitat Mapping
  canDrawHabitatPolygons: true;
  canEditHabitatPolygons: true;
  canAssignFossittCodes: true;
  canDeleteHabitatPolygons: false;

  // Target Notes
  canAddTargetNotes: true;
  canEditOwnTargetNotes: true;
  canDeleteOwnTargetNotes: true;
  canVerifyTargetNotes: false;

  // Reporting
  canViewAIDraft: true;
  canEditReport: true;
  canAddEcologicalOpinion: true;
  canSubmitForReview: true;
  canApproveReport: false;
  canFinalSubmit: false;
  canDownloadReport: true;

  // Team & System
  canViewTeamMembers: true;
  canManageTeam: false;
  canViewAuditTrail: false;
  canViewTimesheets: false;
  canAccessSettings: false;
}
```

---

## Workflow Access

### 10-Step Workflow Permissions

| Step | Name | Assessor Access | Notes |
|------|------|-----------------|-------|
| **Phase 1: Desk Research** |
| 1 | GIS Mapping | ✅ Full | Can draw/edit boundaries |
| 2 | Data Gathering | ✅ Full | Can search and save findings |
| 3 | Desk Assessment | ✅ Edit | Can edit assessments |
| **Phase 2: Field Research** |
| 4 | Field Survey | ✅ Full | Can create surveys, add observations |
| 5 | Habitat Mapping | ✅ Full | Can draw polygons, assign codes |
| 6 | Target Notes | ✅ Add/Edit | Cannot verify (Admin only) |
| **Phase 3: Reporting** |
| 7 | Data Analysis | ✅ View | Can view statistics |
| 8 | AI Draft | ✅ Edit | Can edit draft content |
| 9 | Quality Review | ⚠️ Submit only | Cannot approve |
| 10 | Final Submission | ❌ None | Admin only |

### Workflow Step Status Changes

Assessor can change workflow status to:
- ✅ `pending` → `in_progress`
- ✅ `in_progress` → `needs_review`
- ❌ `needs_review` → `approved` (Admin only)
- ❌ Any → `blocked` (Admin only)

---

## User Interface Considerations

### Dashboard View

Assessor dashboard should show:
- Projects assigned to them
- Their pending tasks
- Recent activity on their projects
- Upcoming survey deadlines

Should NOT show:
- All organization projects
- Team management
- Audit trail
- Timesheets
- System settings

### Navigation Menu

```
Assessor Sidebar:
├── Dashboard (filtered to assigned projects)
├── My Projects
│   └── [List of assigned projects]
├── Field Surveys (quick access)
└── Help & Resources
```

Hidden from Assessor:
- Team Members
- Audit Trail
- Timesheets
- Settings

### Project View

When Assessor opens a project:
- Show all 10 workflow steps
- Enable editing for steps 1-8
- Show step 9 as "Submit for Review" button
- Hide or disable step 10

### Visual Indicators

- Use badges to show "Assigned to you" on projects
- Show "Pending Review" status for submitted work
- Highlight "Needs your input" items

---

## Implementation Notes

### Database Considerations

1. **Project Assignment**
   - Assessors should only see projects where they are assigned
   - Use `project_team_members` table for access control

2. **Ownership Tracking**
   - Track `created_by` for findings, observations, notes
   - Assessors can only edit/delete their own items

3. **Audit Trail**
   - Log all Assessor actions for Admin review
   - Assessor cannot view the audit trail

### Row Level Security (RLS)

```sql
-- Assessor can only view assigned projects
CREATE POLICY "Assessors view assigned projects"
ON projects FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM project_team_members
    WHERE project_id = projects.id
  )
  OR auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- Assessor can only edit own findings
CREATE POLICY "Assessors edit own findings"
ON desk_research_findings FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);
```

### Frontend Guards

```typescript
// Example permission check
const { permissions } = useRole();

if (permissions.canApproveReport) {
  // Show approve button (Admin only)
}

if (permissions.canEditReport) {
  // Show edit button (Admin and Assessor)
}
```

---

## Related Documents

- [USER_PERSONAS_AND_USE_CASES.md](../USER_PERSONAS_AND_USE_CASES.md)
- [prd.md](../prd.md)
- [Ecological_survey_types.md](../Ecological_survey_types.md)

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Feb 2026 | - | Initial draft |
