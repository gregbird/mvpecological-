export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1'
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: Database['public']['Enums']['audit_action']
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: Database['public']['Enums']['audit_action']
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: Database['public']['Enums']['audit_action']
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'audit_log_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_name: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'clients_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      desk_research_findings: {
        Row: {
          content: string | null
          created_at: string
          created_by: string
          data_type: Database['public']['Enums']['finding_data_type']
          id: string
          is_saved: boolean
          location: unknown
          notes: string | null
          project_id: string
          raw_data: Json | null
          source: Database['public']['Enums']['data_source']
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by: string
          data_type: Database['public']['Enums']['finding_data_type']
          id?: string
          is_saved?: boolean
          location?: unknown
          notes?: string | null
          project_id: string
          raw_data?: Json | null
          source: Database['public']['Enums']['data_source']
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string
          data_type?: Database['public']['Enums']['finding_data_type']
          id?: string
          is_saved?: boolean
          location?: unknown
          notes?: string | null
          project_id?: string
          raw_data?: Json | null
          source?: Database['public']['Enums']['data_source']
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'desk_research_findings_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'desk_research_findings_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      habitat_polygons: {
        Row: {
          area_hectares: number | null
          boundary: unknown
          condition: string | null
          created_at: string
          fossitt_code: string
          fossitt_name: string
          id: string
          notes: string | null
          photos: string[] | null
          project_id: string
          survey_id: string | null
          updated_at: string
        }
        Insert: {
          area_hectares?: number | null
          boundary?: unknown
          condition?: string | null
          created_at?: string
          fossitt_code: string
          fossitt_name: string
          id?: string
          notes?: string | null
          photos?: string[] | null
          project_id: string
          survey_id?: string | null
          updated_at?: string
        }
        Update: {
          area_hectares?: number | null
          boundary?: unknown
          condition?: string | null
          created_at?: string
          fossitt_code?: string
          fossitt_name?: string
          id?: string
          notes?: string | null
          photos?: string[] | null
          project_id?: string
          survey_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'habitat_polygons_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'habitat_polygons_survey_id_fkey'
            columns: ['survey_id']
            isOneToOne: false
            referencedRelation: 'surveys'
            referencedColumns: ['id']
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database['public']['Enums']['user_role']
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database['public']['Enums']['user_role']
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database['public']['Enums']['user_role']
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invites_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invites_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          settings: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          location: unknown
          observation_id: string | null
          storage_path: string
          survey_id: string | null
          taken_at: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          location?: unknown
          observation_id?: string | null
          storage_path: string
          survey_id?: string | null
          taken_at?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          location?: unknown
          observation_id?: string | null
          storage_path?: string
          survey_id?: string | null
          taken_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'photos_observation_id_fkey'
            columns: ['observation_id']
            isOneToOne: false
            referencedRelation: 'species_observations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'photos_survey_id_fkey'
            columns: ['survey_id']
            isOneToOne: false
            referencedRelation: 'surveys'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          organization_id: string
          role: Database['public']['Enums']['user_role']
          settings: Json | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          organization_id: string
          role?: Database['public']['Enums']['user_role']
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          organization_id?: string
          role?: Database['public']['Enums']['user_role']
          settings?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      project_members: {
        Row: {
          assigned_at: string
          id: string
          project_id: string
          role: Database['public']['Enums']['project_member_role']
          user_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          project_id: string
          role?: Database['public']['Enums']['project_member_role']
          user_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          project_id?: string
          role?: Database['public']['Enums']['project_member_role']
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_members_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      projects: {
        Row: {
          actual_end_date: string | null
          actual_start_date: string | null
          boundary: unknown
          budget_days: number | null
          center_point: unknown
          client_id: string | null
          created_at: string
          created_by: string
          current_phase: Database['public']['Enums']['project_phase']
          expected_end_date: string | null
          expected_start_date: string | null
          grid_reference: string | null
          health_status: Database['public']['Enums']['health_status']
          id: string
          name: string
          organization_id: string
          site_code: string | null
          status: Database['public']['Enums']['project_status']
          survey_type: string | null
          updated_at: string
        }
        Insert: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          boundary?: unknown
          budget_days?: number | null
          center_point?: unknown
          client_id?: string | null
          created_at?: string
          created_by: string
          current_phase?: Database['public']['Enums']['project_phase']
          expected_end_date?: string | null
          expected_start_date?: string | null
          grid_reference?: string | null
          health_status?: Database['public']['Enums']['health_status']
          id?: string
          name: string
          organization_id: string
          site_code?: string | null
          status?: Database['public']['Enums']['project_status']
          survey_type?: string | null
          updated_at?: string
        }
        Update: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          boundary?: unknown
          budget_days?: number | null
          center_point?: unknown
          client_id?: string | null
          created_at?: string
          created_by?: string
          current_phase?: Database['public']['Enums']['project_phase']
          expected_end_date?: string | null
          expected_start_date?: string | null
          grid_reference?: string | null
          health_status?: Database['public']['Enums']['health_status']
          id?: string
          name?: string
          organization_id?: string
          site_code?: string | null
          status?: Database['public']['Enums']['project_status']
          survey_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'projects_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projects_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projects_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      reports: {
        Row: {
          content: Json | null
          created_at: string
          generated_by: string | null
          id: string
          project_id: string
          report_type: string
          reviewed_by: string | null
          status: Database['public']['Enums']['report_status']
          updated_at: string
          version: number
        }
        Insert: {
          content?: Json | null
          created_at?: string
          generated_by?: string | null
          id?: string
          project_id: string
          report_type: string
          reviewed_by?: string | null
          status?: Database['public']['Enums']['report_status']
          updated_at?: string
          version?: number
        }
        Update: {
          content?: Json | null
          created_at?: string
          generated_by?: string | null
          id?: string
          project_id?: string
          report_type?: string
          reviewed_by?: string | null
          status?: Database['public']['Enums']['report_status']
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'reports_generated_by_fkey'
            columns: ['generated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reports_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reports_reviewed_by_fkey'
            columns: ['reviewed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      species_observations: {
        Row: {
          abundance_dafor: string | null
          behavior_notes: string | null
          confidence_level: Database['public']['Enums']['confidence_level']
          count: number | null
          created_at: string
          designation: string | null
          evidence_type: string | null
          gps_accuracy: number | null
          id: string
          is_protected: boolean
          local_id: string | null
          location: unknown
          needs_verification: boolean
          photos: string[] | null
          species_name_common: string | null
          species_name_scientific: string
          survey_id: string
          taxon_group: string | null
          updated_at: string
          verified_by: string | null
        }
        Insert: {
          abundance_dafor?: string | null
          behavior_notes?: string | null
          confidence_level?: Database['public']['Enums']['confidence_level']
          count?: number | null
          created_at?: string
          designation?: string | null
          evidence_type?: string | null
          gps_accuracy?: number | null
          id?: string
          is_protected?: boolean
          local_id?: string | null
          location?: unknown
          needs_verification?: boolean
          photos?: string[] | null
          species_name_common?: string | null
          species_name_scientific: string
          survey_id: string
          taxon_group?: string | null
          updated_at?: string
          verified_by?: string | null
        }
        Update: {
          abundance_dafor?: string | null
          behavior_notes?: string | null
          confidence_level?: Database['public']['Enums']['confidence_level']
          count?: number | null
          created_at?: string
          designation?: string | null
          evidence_type?: string | null
          gps_accuracy?: number | null
          id?: string
          is_protected?: boolean
          local_id?: string | null
          location?: unknown
          needs_verification?: boolean
          photos?: string[] | null
          species_name_common?: string | null
          species_name_scientific?: string
          survey_id?: string
          taxon_group?: string | null
          updated_at?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'species_observations_survey_id_fkey'
            columns: ['survey_id']
            isOneToOne: false
            referencedRelation: 'surveys'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'species_observations_verified_by_fkey'
            columns: ['verified_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      surveys: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          local_id: string | null
          notes: string | null
          project_id: string
          start_time: string | null
          status: Database['public']['Enums']['survey_status']
          survey_date: string
          survey_type: string
          surveyor_id: string
          sync_status: Database['public']['Enums']['sync_status']
          updated_at: string
          weather: Json | null
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          local_id?: string | null
          notes?: string | null
          project_id: string
          start_time?: string | null
          status?: Database['public']['Enums']['survey_status']
          survey_date: string
          survey_type: string
          surveyor_id: string
          sync_status?: Database['public']['Enums']['sync_status']
          updated_at?: string
          weather?: Json | null
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          local_id?: string | null
          notes?: string | null
          project_id?: string
          start_time?: string | null
          status?: Database['public']['Enums']['survey_status']
          survey_date?: string
          survey_type?: string
          surveyor_id?: string
          sync_status?: Database['public']['Enums']['sync_status']
          updated_at?: string
          weather?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'surveys_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'surveys_surveyor_id_fkey'
            columns: ['surveyor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      workflow_steps: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          name: string
          notes: string | null
          phase: Database['public']['Enums']['project_phase']
          project_id: string
          reviewer: string | null
          started_at: string | null
          status: Database['public']['Enums']['workflow_status']
          step_number: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          name: string
          notes?: string | null
          phase: Database['public']['Enums']['project_phase']
          project_id: string
          reviewer?: string | null
          started_at?: string | null
          status?: Database['public']['Enums']['workflow_status']
          step_number: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          phase?: Database['public']['Enums']['project_phase']
          project_id?: string
          reviewer?: string | null
          started_at?: string | null
          status?: Database['public']['Enums']['workflow_status']
          step_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workflow_steps_assigned_to_fkey'
            columns: ['assigned_to']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workflow_steps_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workflow_steps_reviewer_fkey'
            columns: ['reviewer']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_invite_by_token: {
        Args: { invite_token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          organization_id: string
          organization_name: string
          role: Database['public']['Enums']['user_role']
        }[]
      }
    }
    Enums: {
      audit_action: 'INSERT' | 'UPDATE' | 'DELETE'
      confidence_level: 'high' | 'medium' | 'low'
      data_source: 'npws' | 'gbif' | 'nbdc' | 'epa' | 'catchments' | 'manual'
      finding_data_type:
        | 'designated_site'
        | 'species_record'
        | 'water_quality'
        | 'catchment'
        | 'other'
      health_status: 'on_track' | 'at_risk' | 'overdue'
      project_member_role: 'lead' | 'surveyor' | 'analyst' | 'reviewer' | 'viewer'
      project_phase: 'desk_research' | 'field_research' | 'reporting'
      project_status: 'draft' | 'active' | 'completed' | 'archived'
      report_status: 'draft' | 'internal_review' | 'client_review' | 'approved' | 'final'
      survey_status: 'planned' | 'in_progress' | 'completed' | 'approved'
      sync_status: 'synced' | 'pending' | 'conflict'
      user_role: 'admin' | 'assessor' | 'client'
      workflow_status: 'pending' | 'in_progress' | 'needs_review' | 'approved' | 'blocked'
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

// Helper types for common use cases
export type Profile = Tables<'profiles'>
export type Organization = Tables<'organizations'>
export type Project = Tables<'projects'>
export type Client = Tables<'clients'>
export type Survey = Tables<'surveys'>
export type Invite = Tables<'invites'>
export type WorkflowStep = Tables<'workflow_steps'>
export type Report = Tables<'reports'>
export type HabitatPolygon = Tables<'habitat_polygons'>
export type SpeciesObservation = Tables<'species_observations'>
export type DeskResearchFinding = Tables<'desk_research_findings'>

export type UserRole = Database['public']['Enums']['user_role']
export type ProjectStatus = Database['public']['Enums']['project_status']
export type ProjectPhase = Database['public']['Enums']['project_phase']
export type HealthStatus = Database['public']['Enums']['health_status']
export type WorkflowStatus = Database['public']['Enums']['workflow_status']

// Insert and Update helper types
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
