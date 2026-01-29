export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          settings: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          organization_id: string
          email: string
          full_name: string
          role:
            | 'admin'
            | 'senior_ecologist'
            | 'field_ecologist'
            | 'gis_specialist'
            | 'junior_ecologist'
            | 'client'
          avatar_url: string | null
          settings: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          organization_id: string
          email: string
          full_name: string
          role?:
            | 'admin'
            | 'senior_ecologist'
            | 'field_ecologist'
            | 'gis_specialist'
            | 'junior_ecologist'
            | 'client'
          avatar_url?: string | null
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          full_name?: string
          role?:
            | 'admin'
            | 'senior_ecologist'
            | 'field_ecologist'
            | 'gis_specialist'
            | 'junior_ecologist'
            | 'client'
          avatar_url?: string | null
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          organization_id: string
          name: string
          contact_email: string | null
          contact_name: string | null
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          contact_email?: string | null
          contact_name?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          contact_email?: string | null
          contact_name?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          organization_id: string
          client_id: string | null
          name: string
          site_code: string | null
          survey_type: string | null
          status: 'draft' | 'active' | 'completed' | 'archived'
          current_phase: 'desk_research' | 'field_research' | 'reporting'
          health_status: 'on_track' | 'at_risk' | 'overdue'
          expected_start_date: string | null
          expected_end_date: string | null
          actual_start_date: string | null
          actual_end_date: string | null
          budget_days: number | null
          boundary: unknown | null // PostGIS geometry
          center_point: unknown | null // PostGIS geometry
          grid_reference: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          client_id?: string | null
          name: string
          site_code?: string | null
          survey_type?: string | null
          status?: 'draft' | 'active' | 'completed' | 'archived'
          current_phase?: 'desk_research' | 'field_research' | 'reporting'
          health_status?: 'on_track' | 'at_risk' | 'overdue'
          expected_start_date?: string | null
          expected_end_date?: string | null
          actual_start_date?: string | null
          actual_end_date?: string | null
          budget_days?: number | null
          boundary?: unknown | null
          center_point?: unknown | null
          grid_reference?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          client_id?: string | null
          name?: string
          site_code?: string | null
          survey_type?: string | null
          status?: 'draft' | 'active' | 'completed' | 'archived'
          current_phase?: 'desk_research' | 'field_research' | 'reporting'
          health_status?: 'on_track' | 'at_risk' | 'overdue'
          expected_start_date?: string | null
          expected_end_date?: string | null
          actual_start_date?: string | null
          actual_end_date?: string | null
          budget_days?: number | null
          boundary?: unknown | null
          center_point?: unknown | null
          grid_reference?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: 'lead' | 'surveyor' | 'analyst' | 'reviewer' | 'viewer'
          assigned_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role?: 'lead' | 'surveyor' | 'analyst' | 'reviewer' | 'viewer'
          assigned_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: 'lead' | 'surveyor' | 'analyst' | 'reviewer' | 'viewer'
          assigned_at?: string
        }
      }
      workflow_steps: {
        Row: {
          id: string
          project_id: string
          step_number: number
          name: string
          phase: 'desk_research' | 'field_research' | 'reporting'
          status: 'pending' | 'in_progress' | 'needs_review' | 'approved' | 'blocked'
          assigned_to: string | null
          reviewer: string | null
          started_at: string | null
          completed_at: string | null
          due_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          step_number: number
          name: string
          phase: 'desk_research' | 'field_research' | 'reporting'
          status?: 'pending' | 'in_progress' | 'needs_review' | 'approved' | 'blocked'
          assigned_to?: string | null
          reviewer?: string | null
          started_at?: string | null
          completed_at?: string | null
          due_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          step_number?: number
          name?: string
          phase?: 'desk_research' | 'field_research' | 'reporting'
          status?: 'pending' | 'in_progress' | 'needs_review' | 'approved' | 'blocked'
          assigned_to?: string | null
          reviewer?: string | null
          started_at?: string | null
          completed_at?: string | null
          due_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      desk_research_findings: {
        Row: {
          id: string
          project_id: string
          source: 'npws' | 'gbif' | 'nbdc' | 'epa' | 'catchments' | 'manual'
          data_type: 'designated_site' | 'species_record' | 'water_quality' | 'catchment' | 'other'
          title: string
          content: string | null
          raw_data: Json | null
          location: unknown | null // PostGIS geometry
          is_saved: boolean
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          source: 'npws' | 'gbif' | 'nbdc' | 'epa' | 'catchments' | 'manual'
          data_type: 'designated_site' | 'species_record' | 'water_quality' | 'catchment' | 'other'
          title: string
          content?: string | null
          raw_data?: Json | null
          location?: unknown | null
          is_saved?: boolean
          notes?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          source?: 'npws' | 'gbif' | 'nbdc' | 'epa' | 'catchments' | 'manual'
          data_type?: 'designated_site' | 'species_record' | 'water_quality' | 'catchment' | 'other'
          title?: string
          content?: string | null
          raw_data?: Json | null
          location?: unknown | null
          is_saved?: boolean
          notes?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      surveys: {
        Row: {
          id: string
          project_id: string
          survey_type: string
          surveyor_id: string
          survey_date: string
          start_time: string | null
          end_time: string | null
          weather: Json | null
          status: 'planned' | 'in_progress' | 'completed' | 'approved'
          notes: string | null
          sync_status: 'synced' | 'pending' | 'conflict'
          local_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          survey_type: string
          surveyor_id: string
          survey_date: string
          start_time?: string | null
          end_time?: string | null
          weather?: Json | null
          status?: 'planned' | 'in_progress' | 'completed' | 'approved'
          notes?: string | null
          sync_status?: 'synced' | 'pending' | 'conflict'
          local_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          survey_type?: string
          surveyor_id?: string
          survey_date?: string
          start_time?: string | null
          end_time?: string | null
          weather?: Json | null
          status?: 'planned' | 'in_progress' | 'completed' | 'approved'
          notes?: string | null
          sync_status?: 'synced' | 'pending' | 'conflict'
          local_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      species_observations: {
        Row: {
          id: string
          survey_id: string
          species_name_scientific: string
          species_name_common: string | null
          taxon_group: string | null
          count: number | null
          abundance_dafor: string | null
          evidence_type: string | null
          behavior_notes: string | null
          location: unknown | null // PostGIS Point
          gps_accuracy: number | null
          photos: string[] | null
          is_protected: boolean
          designation: string | null
          confidence_level: 'high' | 'medium' | 'low'
          needs_verification: boolean
          verified_by: string | null
          local_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          survey_id: string
          species_name_scientific: string
          species_name_common?: string | null
          taxon_group?: string | null
          count?: number | null
          abundance_dafor?: string | null
          evidence_type?: string | null
          behavior_notes?: string | null
          location?: unknown | null
          gps_accuracy?: number | null
          photos?: string[] | null
          is_protected?: boolean
          designation?: string | null
          confidence_level?: 'high' | 'medium' | 'low'
          needs_verification?: boolean
          verified_by?: string | null
          local_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          survey_id?: string
          species_name_scientific?: string
          species_name_common?: string | null
          taxon_group?: string | null
          count?: number | null
          abundance_dafor?: string | null
          evidence_type?: string | null
          behavior_notes?: string | null
          location?: unknown | null
          gps_accuracy?: number | null
          photos?: string[] | null
          is_protected?: boolean
          designation?: string | null
          confidence_level?: 'high' | 'medium' | 'low'
          needs_verification?: boolean
          verified_by?: string | null
          local_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      habitat_polygons: {
        Row: {
          id: string
          project_id: string
          survey_id: string | null
          fossitt_code: string
          fossitt_name: string
          boundary: unknown | null // PostGIS Polygon
          area_hectares: number | null
          condition: string | null
          notes: string | null
          photos: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          survey_id?: string | null
          fossitt_code: string
          fossitt_name: string
          boundary?: unknown | null
          area_hectares?: number | null
          condition?: string | null
          notes?: string | null
          photos?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          survey_id?: string | null
          fossitt_code?: string
          fossitt_name?: string
          boundary?: unknown | null
          area_hectares?: number | null
          condition?: string | null
          notes?: string | null
          photos?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      photos: {
        Row: {
          id: string
          survey_id: string | null
          observation_id: string | null
          storage_path: string
          location: unknown | null // PostGIS Point
          taken_at: string | null
          caption: string | null
          created_at: string
        }
        Insert: {
          id?: string
          survey_id?: string | null
          observation_id?: string | null
          storage_path: string
          location?: unknown | null
          taken_at?: string | null
          caption?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          survey_id?: string | null
          observation_id?: string | null
          storage_path?: string
          location?: unknown | null
          taken_at?: string | null
          caption?: string | null
          created_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          project_id: string
          report_type: string
          version: number
          status: 'draft' | 'internal_review' | 'client_review' | 'approved' | 'final'
          content: Json | null
          generated_by: string | null
          reviewed_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          report_type: string
          version?: number
          status?: 'draft' | 'internal_review' | 'client_review' | 'approved' | 'final'
          content?: Json | null
          generated_by?: string | null
          reviewed_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          report_type?: string
          version?: number
          status?: 'draft' | 'internal_review' | 'client_review' | 'approved' | 'final'
          content?: Json | null
          generated_by?: string | null
          reviewed_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      audit_log: {
        Row: {
          id: string
          table_name: string
          record_id: string
          action: 'INSERT' | 'UPDATE' | 'DELETE'
          old_data: Json | null
          new_data: Json | null
          user_id: string | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          table_name: string
          record_id: string
          action: 'INSERT' | 'UPDATE' | 'DELETE'
          old_data?: Json | null
          new_data?: Json | null
          user_id?: string | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          table_name?: string
          record_id?: string
          action?: 'INSERT' | 'UPDATE' | 'DELETE'
          old_data?: Json | null
          new_data?: Json | null
          user_id?: string | null
          ip_address?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      project_status: 'draft' | 'active' | 'completed' | 'archived'
      project_phase: 'desk_research' | 'field_research' | 'reporting'
      health_status: 'on_track' | 'at_risk' | 'overdue'
      user_role:
        | 'admin'
        | 'senior_ecologist'
        | 'field_ecologist'
        | 'gis_specialist'
        | 'junior_ecologist'
        | 'client'
      project_member_role: 'lead' | 'surveyor' | 'analyst' | 'reviewer' | 'viewer'
      workflow_status: 'pending' | 'in_progress' | 'needs_review' | 'approved' | 'blocked'
      data_source: 'npws' | 'gbif' | 'nbdc' | 'epa' | 'catchments' | 'manual'
      data_type: 'designated_site' | 'species_record' | 'water_quality' | 'catchment' | 'other'
      survey_status: 'planned' | 'in_progress' | 'completed' | 'approved'
      sync_status: 'synced' | 'pending' | 'conflict'
      confidence_level: 'high' | 'medium' | 'low'
      report_status: 'draft' | 'internal_review' | 'client_review' | 'approved' | 'final'
      audit_action: 'INSERT' | 'UPDATE' | 'DELETE'
    }
  }
}

// Helper types for easier use
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Convenience types
export type Organization = Tables<'organizations'>
export type Profile = Tables<'profiles'>
export type Client = Tables<'clients'>
export type Project = Tables<'projects'>
export type ProjectMember = Tables<'project_members'>
export type WorkflowStep = Tables<'workflow_steps'>
export type DeskResearchFinding = Tables<'desk_research_findings'>
export type Survey = Tables<'surveys'>
export type SpeciesObservation = Tables<'species_observations'>
export type HabitatPolygon = Tables<'habitat_polygons'>
export type Photo = Tables<'photos'>
export type Report = Tables<'reports'>
export type AuditLog = Tables<'audit_log'>
