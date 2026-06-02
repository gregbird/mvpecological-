export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1'
  }
  public: {
    Tables: {
      aquatic_research_results: {
        Row: {
          ai_analysis: string | null
          catchment_name: string | null
          connectivity: Json | null
          created_at: string | null
          current_status: string | null
          failures: Json | null
          finding_id: string | null
          id: string
          linked_sac_code: string | null
          linked_sac_habitats: Json | null
          linked_sac_match_score: number | null
          linked_sac_name: string | null
          linked_sac_species: Json | null
          notes: string | null
          project_id: string
          researched_at: string | null
          researched_by: string | null
          risk_level: string | null
          river_basin_district: string | null
          status_history: Json | null
          sub_catchment_name: string | null
          trends: Json | null
          updated_at: string | null
          water_body_code: string
          water_body_name: string
          water_body_type: string
        }
        Insert: {
          ai_analysis?: string | null
          catchment_name?: string | null
          connectivity?: Json | null
          created_at?: string | null
          current_status?: string | null
          failures?: Json | null
          finding_id?: string | null
          id?: string
          linked_sac_code?: string | null
          linked_sac_habitats?: Json | null
          linked_sac_match_score?: number | null
          linked_sac_name?: string | null
          linked_sac_species?: Json | null
          notes?: string | null
          project_id: string
          researched_at?: string | null
          researched_by?: string | null
          risk_level?: string | null
          river_basin_district?: string | null
          status_history?: Json | null
          sub_catchment_name?: string | null
          trends?: Json | null
          updated_at?: string | null
          water_body_code: string
          water_body_name: string
          water_body_type: string
        }
        Update: {
          ai_analysis?: string | null
          catchment_name?: string | null
          connectivity?: Json | null
          created_at?: string | null
          current_status?: string | null
          failures?: Json | null
          finding_id?: string | null
          id?: string
          linked_sac_code?: string | null
          linked_sac_habitats?: Json | null
          linked_sac_match_score?: number | null
          linked_sac_name?: string | null
          linked_sac_species?: Json | null
          notes?: string | null
          project_id?: string
          researched_at?: string | null
          researched_by?: string | null
          risk_level?: string | null
          river_basin_district?: string | null
          status_history?: Json | null
          sub_catchment_name?: string | null
          trends?: Json | null
          updated_at?: string | null
          water_body_code?: string
          water_body_name?: string
          water_body_type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'aquatic_research_results_finding_id_fkey'
            columns: ['finding_id']
            isOneToOne: false
            referencedRelation: 'desk_research_findings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'aquatic_research_results_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'aquatic_research_results_researched_by_fkey'
            columns: ['researched_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
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
      baseline_report_cache: {
        Row: {
          boundary_hash: string
          computed_at: string
          created_at: string
          feature_collection: Json | null
          habitats: Json
          id: string
          project_id: string
          total_area_ha: number
          updated_at: string
        }
        Insert: {
          boundary_hash: string
          computed_at?: string
          created_at?: string
          feature_collection?: Json | null
          habitats?: Json
          id?: string
          project_id: string
          total_area_ha?: number
          updated_at?: string
        }
        Update: {
          boundary_hash?: string
          computed_at?: string
          created_at?: string
          feature_collection?: Json | null
          habitats?: Json
          id?: string
          project_id?: string
          total_area_ha?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'baseline_report_cache_project_id_fkey'
            columns: ['project_id']
            isOneToOne: true
            referencedRelation: 'projects'
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
      deep_research_results: {
        Row: {
          ai_analysis: string | null
          conservation_summary: Json | null
          created_at: string | null
          finding_id: string | null
          habitats: Json | null
          id: string
          notes: string | null
          project_id: string
          researched_at: string | null
          researched_by: string | null
          site_code: string
          site_name: string
          site_type: string
          threats_pressures: Json | null
          updated_at: string | null
        }
        Insert: {
          ai_analysis?: string | null
          conservation_summary?: Json | null
          created_at?: string | null
          finding_id?: string | null
          habitats?: Json | null
          id?: string
          notes?: string | null
          project_id: string
          researched_at?: string | null
          researched_by?: string | null
          site_code: string
          site_name: string
          site_type: string
          threats_pressures?: Json | null
          updated_at?: string | null
        }
        Update: {
          ai_analysis?: string | null
          conservation_summary?: Json | null
          created_at?: string | null
          finding_id?: string | null
          habitats?: Json | null
          id?: string
          notes?: string | null
          project_id?: string
          researched_at?: string | null
          researched_by?: string | null
          site_code?: string
          site_name?: string
          site_type?: string
          threats_pressures?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'deep_research_results_finding_id_fkey'
            columns: ['finding_id']
            isOneToOne: false
            referencedRelation: 'desk_research_findings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deep_research_results_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      desk_research_findings: {
        Row: {
          ai_summary: string | null
          common_name: string | null
          content: string | null
          created_at: string
          created_by: string
          data_type: Database['public']['Enums']['finding_data_type']
          distance_from_boundary_km: number | null
          fossitt_code: string | null
          id: string
          include_in_report: boolean
          is_invasive: boolean | null
          is_protected: boolean | null
          is_saved: boolean
          is_threatened: boolean | null
          location: unknown
          notes: string | null
          project_id: string
          raw_data: Json | null
          red_list_status: string | null
          relevance_level: string | null
          scientific_name: string | null
          site_code: string | null
          site_id: string | null
          site_type: string | null
          source: Database['public']['Enums']['data_source']
          taxon_group: string | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          common_name?: string | null
          content?: string | null
          created_at?: string
          created_by: string
          data_type: Database['public']['Enums']['finding_data_type']
          distance_from_boundary_km?: number | null
          fossitt_code?: string | null
          id?: string
          include_in_report?: boolean
          is_invasive?: boolean | null
          is_protected?: boolean | null
          is_saved?: boolean
          is_threatened?: boolean | null
          location?: unknown
          notes?: string | null
          project_id: string
          raw_data?: Json | null
          red_list_status?: string | null
          relevance_level?: string | null
          scientific_name?: string | null
          site_code?: string | null
          site_id?: string | null
          site_type?: string | null
          source: Database['public']['Enums']['data_source']
          taxon_group?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          common_name?: string | null
          content?: string | null
          created_at?: string
          created_by?: string
          data_type?: Database['public']['Enums']['finding_data_type']
          distance_from_boundary_km?: number | null
          fossitt_code?: string | null
          id?: string
          include_in_report?: boolean
          is_invasive?: boolean | null
          is_protected?: boolean | null
          is_saved?: boolean
          is_threatened?: boolean | null
          location?: unknown
          notes?: string | null
          project_id?: string
          raw_data?: Json | null
          red_list_status?: string | null
          relevance_level?: string | null
          scientific_name?: string | null
          site_code?: string | null
          site_id?: string | null
          site_type?: string | null
          source?: Database['public']['Enums']['data_source']
          taxon_group?: string | null
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
          {
            foreignKeyName: 'desk_research_findings_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'project_sites'
            referencedColumns: ['id']
          },
        ]
      }
      document_chunk_mentions: {
        Row: {
          chunk_id: string
          confidence: number | null
          created_at: string
          entity_canonical: string | null
          entity_type: string
          entity_value: string
          id: string
          raw_snippet: string | null
        }
        Insert: {
          chunk_id: string
          confidence?: number | null
          created_at?: string
          entity_canonical?: string | null
          entity_type: string
          entity_value: string
          id?: string
          raw_snippet?: string | null
        }
        Update: {
          chunk_id?: string
          confidence?: number | null
          created_at?: string
          entity_canonical?: string | null
          entity_type?: string
          entity_value?: string
          id?: string
          raw_snippet?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'document_chunk_mentions_chunk_id_fkey'
            columns: ['chunk_id']
            isOneToOne: false
            referencedRelation: 'document_chunks'
            referencedColumns: ['id']
          },
        ]
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          content_tsv: unknown
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          page_end: number | null
          page_start: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          content_tsv?: unknown
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          page_end?: number | null
          page_start?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          content_tsv?: unknown
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          page_end?: number | null
          page_start?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'document_chunks_document_id_fkey'
            columns: ['document_id']
            isOneToOne: false
            referencedRelation: 'indexed_documents'
            referencedColumns: ['id']
          },
        ]
      }
      dropbox_connections: {
        Row: {
          access_token: string
          account_email: string
          account_id: string
          connected_by: string
          created_at: string
          cursor: string | null
          id: string
          last_synced_at: string | null
          organization_id: string
          refresh_token: string | null
          root_folder_path: string | null
          selected_folders: string[] | null
          status: string
          updated_at: string
        }
        Insert: {
          access_token: string
          account_email: string
          account_id: string
          connected_by: string
          created_at?: string
          cursor?: string | null
          id?: string
          last_synced_at?: string | null
          organization_id: string
          refresh_token?: string | null
          root_folder_path?: string | null
          selected_folders?: string[] | null
          status?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          account_email?: string
          account_id?: string
          connected_by?: string
          created_at?: string
          cursor?: string | null
          id?: string
          last_synced_at?: string | null
          organization_id?: string
          refresh_token?: string | null
          root_folder_path?: string | null
          selected_folders?: string[] | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'dropbox_connections_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
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
          eu_annex_code: string | null
          evaluation: string | null
          fossitt_code: string
          fossitt_name: string
          id: string
          include_in_report: boolean
          listed_species: string[] | null
          notes: string | null
          photos: string[] | null
          project_id: string
          site_id: string | null
          survey_id: string | null
          survey_method: string | null
          threats: string[] | null
          updated_at: string
        }
        Insert: {
          area_hectares?: number | null
          boundary?: unknown
          condition?: string | null
          created_at?: string
          eu_annex_code?: string | null
          evaluation?: string | null
          fossitt_code: string
          fossitt_name: string
          id?: string
          include_in_report?: boolean
          listed_species?: string[] | null
          notes?: string | null
          photos?: string[] | null
          project_id: string
          site_id?: string | null
          survey_id?: string | null
          survey_method?: string | null
          threats?: string[] | null
          updated_at?: string
        }
        Update: {
          area_hectares?: number | null
          boundary?: unknown
          condition?: string | null
          created_at?: string
          eu_annex_code?: string | null
          evaluation?: string | null
          fossitt_code?: string
          fossitt_name?: string
          id?: string
          include_in_report?: boolean
          listed_species?: string[] | null
          notes?: string | null
          photos?: string[] | null
          project_id?: string
          site_id?: string | null
          survey_id?: string | null
          survey_method?: string | null
          threats?: string[] | null
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
            foreignKeyName: 'habitat_polygons_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'project_sites'
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
      indexed_documents: {
        Row: {
          connection_id: string
          content_hash: string | null
          created_at: string
          dropbox_modified_at: string | null
          error_message: string | null
          file_extension: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          last_indexed_at: string | null
          organization_id: string
          status: string
          summary: string | null
          summary_generated_at: string | null
          total_chunks: number | null
          updated_at: string
        }
        Insert: {
          connection_id: string
          content_hash?: string | null
          created_at?: string
          dropbox_modified_at?: string | null
          error_message?: string | null
          file_extension: string
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          last_indexed_at?: string | null
          organization_id: string
          status?: string
          summary?: string | null
          summary_generated_at?: string | null
          total_chunks?: number | null
          updated_at?: string
        }
        Update: {
          connection_id?: string
          content_hash?: string | null
          created_at?: string
          dropbox_modified_at?: string | null
          error_message?: string | null
          file_extension?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          last_indexed_at?: string | null
          organization_id?: string
          status?: string
          summary?: string | null
          summary_generated_at?: string | null
          total_chunks?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'indexed_documents_connection_id_fkey'
            columns: ['connection_id']
            isOneToOne: false
            referencedRelation: 'dropbox_connections'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'indexed_documents_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
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
          full_name: string | null
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
          full_name?: string | null
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
          full_name?: string | null
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
      map_screenshots: {
        Row: {
          created_at: string | null
          created_by: string | null
          height: number | null
          id: string
          label: string
          project_id: string
          step_name: string
          storage_path: string
          width: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          height?: number | null
          id?: string
          label: string
          project_id: string
          step_name: string
          storage_path: string
          width?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          height?: number | null
          id?: string
          label?: string
          project_id?: string
          step_name?: string
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'map_screenshots_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
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
          owner_id: string | null
          settings: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id?: string | null
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      photos: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string | null
          habitat_polygon_id: string | null
          id: string
          location: unknown
          notes: string | null
          observation_id: string | null
          project_id: string | null
          site_id: string | null
          storage_path: string
          survey_id: string | null
          tags: string[] | null
          taken_at: string | null
          target_note_id: string | null
          watermarked_path: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          habitat_polygon_id?: string | null
          id?: string
          location?: unknown
          notes?: string | null
          observation_id?: string | null
          project_id?: string | null
          site_id?: string | null
          storage_path: string
          survey_id?: string | null
          tags?: string[] | null
          taken_at?: string | null
          target_note_id?: string | null
          watermarked_path?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          habitat_polygon_id?: string | null
          id?: string
          location?: unknown
          notes?: string | null
          observation_id?: string | null
          project_id?: string | null
          site_id?: string | null
          storage_path?: string
          survey_id?: string | null
          tags?: string[] | null
          taken_at?: string | null
          target_note_id?: string | null
          watermarked_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'photos_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'photos_habitat_polygon_id_fkey'
            columns: ['habitat_polygon_id']
            isOneToOne: false
            referencedRelation: 'habitat_polygons'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'photos_observation_id_fkey'
            columns: ['observation_id']
            isOneToOne: false
            referencedRelation: 'species_observations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'photos_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'photos_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'project_sites'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'photos_survey_id_fkey'
            columns: ['survey_id']
            isOneToOne: false
            referencedRelation: 'surveys'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'photos_target_note_id_fkey'
            columns: ['target_note_id']
            isOneToOne: false
            referencedRelation: 'target_notes'
            referencedColumns: ['id']
          },
        ]
      }
      poc_records: {
        Row: {
          count: number
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          photo_url: string | null
          species_name: string
          sync_status: string | null
          synced_at: string | null
        }
        Insert: {
          count: number
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          photo_url?: string | null
          species_name: string
          sync_status?: string | null
          synced_at?: string | null
        }
        Update: {
          count?: number
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          photo_url?: string | null
          species_name?: string
          sync_status?: string | null
          synced_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          deactivated_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          organization_id: string
          role: Database['public']['Enums']['user_role']
          settings: Json | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deactivated_at?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean
          organization_id: string
          role?: Database['public']['Enums']['user_role']
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deactivated_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
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
      project_report_types: {
        Row: {
          created_at: string
          display_order: number
          id: string
          project_id: string
          report_type: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          project_id: string
          report_type: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          project_id?: string
          report_type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_report_types_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      project_sites: {
        Row: {
          attributes: Json | null
          boundary: unknown
          buffer_distances: number[] | null
          center_point: unknown
          county: string | null
          created_at: string
          grid_reference: string | null
          id: string
          project_id: string
          province: string | null
          site_code: string
          site_name: string | null
          sort_order: number
          townland: string | null
          updated_at: string
          visible_layers: string[] | null
        }
        Insert: {
          attributes?: Json | null
          boundary?: unknown
          buffer_distances?: number[] | null
          center_point?: unknown
          county?: string | null
          created_at?: string
          grid_reference?: string | null
          id?: string
          project_id: string
          province?: string | null
          site_code: string
          site_name?: string | null
          sort_order?: number
          townland?: string | null
          updated_at?: string
          visible_layers?: string[] | null
        }
        Update: {
          attributes?: Json | null
          boundary?: unknown
          buffer_distances?: number[] | null
          center_point?: unknown
          county?: string | null
          created_at?: string
          grid_reference?: string | null
          id?: string
          project_id?: string
          province?: string | null
          site_code?: string
          site_name?: string | null
          sort_order?: number
          townland?: string | null
          updated_at?: string
          visible_layers?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: 'project_sites_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
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
          buffer_distances: number[] | null
          center_point: unknown
          client_id: string | null
          county: string | null
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
          province: string | null
          site_code: string | null
          status: Database['public']['Enums']['project_status']
          survey_type: string | null
          townland: string | null
          updated_at: string
          visible_layers: string[] | null
        }
        Insert: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          boundary?: unknown
          budget_days?: number | null
          buffer_distances?: number[] | null
          center_point?: unknown
          client_id?: string | null
          county?: string | null
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
          province?: string | null
          site_code?: string | null
          status?: Database['public']['Enums']['project_status']
          survey_type?: string | null
          townland?: string | null
          updated_at?: string
          visible_layers?: string[] | null
        }
        Update: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          boundary?: unknown
          budget_days?: number | null
          buffer_distances?: number[] | null
          center_point?: unknown
          client_id?: string | null
          county?: string | null
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
          province?: string | null
          site_code?: string | null
          status?: Database['public']['Enums']['project_status']
          survey_type?: string | null
          townland?: string | null
          updated_at?: string
          visible_layers?: string[] | null
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
      releve_species: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          releve_id: string
          species_cover_domin: number | null
          species_cover_pct: number | null
          species_name_english: string | null
          species_name_latin: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          releve_id: string
          species_cover_domin?: number | null
          species_cover_pct?: number | null
          species_name_english?: string | null
          species_name_latin: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          releve_id?: string
          species_cover_domin?: number | null
          species_cover_pct?: number | null
          species_name_english?: string | null
          species_name_latin?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'releve_species_releve_id_fkey'
            columns: ['releve_id']
            isOneToOne: false
            referencedRelation: 'releve_surveys'
            referencedColumns: ['id']
          },
        ]
      }
      releve_survey_templates: {
        Row: {
          created_at: string
          created_by: string
          custom_fields: Json
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          custom_fields?: Json
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          custom_fields?: Json
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      releve_surveys: {
        Row: {
          accuracy_m: number | null
          aspect: string | null
          cover_bare_rock_pct: number | null
          cover_bare_soil_pct: number | null
          cover_forbs_pct: number | null
          cover_graminea_pct: number | null
          cover_litter_pct: number | null
          cover_mosses_liverworts_pct: number | null
          cover_open_water_pct: number | null
          cover_shrubs_pct: number | null
          cover_trees_pct: number | null
          created_at: string | null
          created_by: string | null
          custom_fields: Json | null
          fauna_observations: string | null
          habitat_type: string | null
          id: string
          location: unknown
          max_height_bryophytes_cm: number | null
          max_height_forbs_cm: number | null
          max_height_graminea_cm: number | null
          max_height_shrubs_cm: number | null
          max_height_trees_m: number | null
          median_height_forbs_cm: number | null
          median_height_graminea_cm: number | null
          other_species_proximity: string | null
          project_id: string
          recorder: string
          releve_area_sqm: number | null
          releve_code: string
          releve_comment: string | null
          site_id: string | null
          site_name: string | null
          slope_degrees: number | null
          soil_stability: string | null
          soil_type: string | null
          survey_date: string
          survey_id: string | null
          survey_x_coord: number | null
          survey_y_coord: number | null
          total_vegetation_cover_pct: number | null
          updated_at: string | null
        }
        Insert: {
          accuracy_m?: number | null
          aspect?: string | null
          cover_bare_rock_pct?: number | null
          cover_bare_soil_pct?: number | null
          cover_forbs_pct?: number | null
          cover_graminea_pct?: number | null
          cover_litter_pct?: number | null
          cover_mosses_liverworts_pct?: number | null
          cover_open_water_pct?: number | null
          cover_shrubs_pct?: number | null
          cover_trees_pct?: number | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json | null
          fauna_observations?: string | null
          habitat_type?: string | null
          id?: string
          location?: unknown
          max_height_bryophytes_cm?: number | null
          max_height_forbs_cm?: number | null
          max_height_graminea_cm?: number | null
          max_height_shrubs_cm?: number | null
          max_height_trees_m?: number | null
          median_height_forbs_cm?: number | null
          median_height_graminea_cm?: number | null
          other_species_proximity?: string | null
          project_id: string
          recorder: string
          releve_area_sqm?: number | null
          releve_code: string
          releve_comment?: string | null
          site_id?: string | null
          site_name?: string | null
          slope_degrees?: number | null
          soil_stability?: string | null
          soil_type?: string | null
          survey_date?: string
          survey_id?: string | null
          survey_x_coord?: number | null
          survey_y_coord?: number | null
          total_vegetation_cover_pct?: number | null
          updated_at?: string | null
        }
        Update: {
          accuracy_m?: number | null
          aspect?: string | null
          cover_bare_rock_pct?: number | null
          cover_bare_soil_pct?: number | null
          cover_forbs_pct?: number | null
          cover_graminea_pct?: number | null
          cover_litter_pct?: number | null
          cover_mosses_liverworts_pct?: number | null
          cover_open_water_pct?: number | null
          cover_shrubs_pct?: number | null
          cover_trees_pct?: number | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json | null
          fauna_observations?: string | null
          habitat_type?: string | null
          id?: string
          location?: unknown
          max_height_bryophytes_cm?: number | null
          max_height_forbs_cm?: number | null
          max_height_graminea_cm?: number | null
          max_height_shrubs_cm?: number | null
          max_height_trees_m?: number | null
          median_height_forbs_cm?: number | null
          median_height_graminea_cm?: number | null
          other_species_proximity?: string | null
          project_id?: string
          recorder?: string
          releve_area_sqm?: number | null
          releve_code?: string
          releve_comment?: string | null
          site_id?: string | null
          site_name?: string | null
          slope_degrees?: number | null
          soil_stability?: string | null
          soil_type?: string | null
          survey_date?: string
          survey_id?: string | null
          survey_x_coord?: number | null
          survey_y_coord?: number | null
          total_vegetation_cover_pct?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'releve_surveys_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'releve_surveys_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'releve_surveys_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'project_sites'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'releve_surveys_survey_id_fkey'
            columns: ['survey_id']
            isOneToOne: false
            referencedRelation: 'surveys'
            referencedColumns: ['id']
          },
        ]
      }
      report_survey_links: {
        Row: {
          created_at: string
          id: string
          project_id: string
          report_type: string
          survey_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          report_type: string
          survey_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          report_type?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'report_survey_links_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'report_survey_links_survey_id_fkey'
            columns: ['survey_id']
            isOneToOne: false
            referencedRelation: 'surveys'
            referencedColumns: ['id']
          },
        ]
      }
      report_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          report_type: string
          sections: Json | null
          updated_at: string
          use_custom: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          report_type: string
          sections?: Json | null
          updated_at?: string
          use_custom?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          report_type?: string
          sections?: Json | null
          updated_at?: string
          use_custom?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'report_templates_organization_id_fkey'
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
          version_name: string | null
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
          version_name?: string | null
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
          version_name?: string | null
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
          include_in_report: boolean
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
          include_in_report?: boolean
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
          include_in_report?: boolean
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
      survey_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          survey_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          survey_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          survey_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'survey_assignments_assigned_by_fkey'
            columns: ['assigned_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'survey_assignments_survey_id_fkey'
            columns: ['survey_id']
            isOneToOne: false
            referencedRelation: 'surveys'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'survey_assignments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      survey_templates: {
        Row: {
          created_at: string
          created_by: string | null
          default_fields: Json | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          survey_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_fields?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          survey_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_fields?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          survey_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'survey_templates_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      surveys: {
        Row: {
          created_at: string
          end_time: string | null
          form_data: Json | null
          id: string
          local_id: string | null
          notes: string | null
          project_id: string
          site_id: string | null
          start_time: string | null
          status: Database['public']['Enums']['survey_status']
          survey_date: string
          survey_type: string
          surveyor_id: string
          sync_status: Database['public']['Enums']['sync_status']
          updated_at: string
          visit_group_id: string | null
          visit_number: number | null
          weather: Json | null
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          form_data?: Json | null
          id?: string
          local_id?: string | null
          notes?: string | null
          project_id: string
          site_id?: string | null
          start_time?: string | null
          status?: Database['public']['Enums']['survey_status']
          survey_date: string
          survey_type: string
          surveyor_id: string
          sync_status?: Database['public']['Enums']['sync_status']
          updated_at?: string
          visit_group_id?: string | null
          visit_number?: number | null
          weather?: Json | null
        }
        Update: {
          created_at?: string
          end_time?: string | null
          form_data?: Json | null
          id?: string
          local_id?: string | null
          notes?: string | null
          project_id?: string
          site_id?: string | null
          start_time?: string | null
          status?: Database['public']['Enums']['survey_status']
          survey_date?: string
          survey_type?: string
          surveyor_id?: string
          sync_status?: Database['public']['Enums']['sync_status']
          updated_at?: string
          visit_group_id?: string | null
          visit_number?: number | null
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
            foreignKeyName: 'surveys_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'project_sites'
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
      target_notes: {
        Row: {
          category: string
          created_at: string | null
          created_by: string
          description: string | null
          finding_id: string | null
          id: string
          include_in_report: boolean
          is_verified: boolean | null
          location: unknown
          photos: string[] | null
          priority: string | null
          project_id: string
          site_id: string | null
          survey_id: string | null
          title: string
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by: string
          description?: string | null
          finding_id?: string | null
          id?: string
          include_in_report?: boolean
          is_verified?: boolean | null
          location?: unknown
          photos?: string[] | null
          priority?: string | null
          project_id: string
          site_id?: string | null
          survey_id?: string | null
          title: string
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          finding_id?: string | null
          id?: string
          include_in_report?: boolean
          is_verified?: boolean | null
          location?: unknown
          photos?: string[] | null
          priority?: string | null
          project_id?: string
          site_id?: string | null
          survey_id?: string | null
          title?: string
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'target_notes_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'target_notes_finding_id_fkey'
            columns: ['finding_id']
            isOneToOne: false
            referencedRelation: 'desk_research_findings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'target_notes_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'target_notes_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'project_sites'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'target_notes_survey_id_fkey'
            columns: ['survey_id']
            isOneToOne: false
            referencedRelation: 'surveys'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'target_notes_verified_by_fkey'
            columns: ['verified_by']
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
          metadata: Json | null
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
          metadata?: Json | null
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
          metadata?: Json | null
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
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ''?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { '': string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      delete_project_site: { Args: { p_site_id: string }; Returns: Json }
      get_site_impact_counts: { Args: { p_site_id: string }; Returns: Json }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { '': string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { '': string }; Returns: unknown }
      get_habitat_polygons_geojson: {
        Args: { p_project_id: string }
        Returns: {
          area_hectares: number
          boundary_geojson: Json
          condition: string
          fossitt_code: string
          fossitt_name: string
          id: string
        }[]
      }
      get_habitats_with_geojson: {
        Args: { p_project_id: string }
        Returns: {
          area_hectares: number
          boundary: Json
          condition: string
          created_at: string
          eu_annex_code: string
          evaluation: string
          fossitt_code: string
          fossitt_name: string
          id: string
          include_in_report: boolean
          listed_species: string[]
          notes: string
          photos: string[]
          project_id: string
          survey_id: string
          survey_method: string
          threats: string[]
          updated_at: string
        }[]
      }
      get_invite_by_token: {
        Args: { invite_token: string }
        Returns: {
          email: string
          expires_at: string
          full_name: string
          id: string
          organization_id: string
          organization_name: string
          role: Database['public']['Enums']['user_role']
        }[]
      }
      get_project_sites_with_geojson: {
        Args: { p_project_id: string }
        Returns: Json
      }
      get_project_with_geojson: {
        Args: { p_project_id: string }
        Returns: Json
      }
      get_user_organization_id: { Args: { user_id: string }; Returns: string }
      gettransactionid: { Args: never; Returns: unknown }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      search_document_chunks: {
        Args: { p_limit?: number; p_organization_id: string; p_query: string }
        Returns: {
          chunk_id: string
          chunk_index: number
          content: string
          document_id: string
          file_extension: string
          file_name: string
          file_path: string
          page_end: number
          page_start: number
          rank: number
          total_chunks: number
        }[]
      }
      search_document_chunks_semantic: {
        Args: {
          p_embedding: string
          p_limit?: number
          p_match_threshold?: number
          p_organization_id: string
        }
        Returns: {
          chunk_id: string
          chunk_index: number
          content: string
          document_id: string
          file_extension: string
          file_name: string
          file_path: string
          page_end: number
          page_start: number
          similarity: number
          total_chunks: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { '': string }; Returns: string[] }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { '': string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { '': string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { '': string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { '': string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { '': string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { '': string }; Returns: string }
      st_astext: { Args: { '': string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { '': string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { '': string }; Returns: unknown }
      st_geographyfromtext: { Args: { '': string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { '': string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { '': string }; Returns: unknown }
      st_geomfromewkt: { Args: { '': string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { '': Json }; Returns: unknown }
        | { Args: { '': Json }; Returns: unknown }
        | { Args: { '': string }; Returns: unknown }
      st_geomfromgml: { Args: { '': string }; Returns: unknown }
      st_geomfromkml: { Args: { '': string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { '': string }; Returns: unknown }
      st_gmltosql: { Args: { '': string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database['public']['CompositeTypes']['valid_detail']
        SetofOptions: {
          from: '*'
          to: 'valid_detail'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { '': string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { '': string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { '': string }; Returns: unknown }
      st_mpointfromtext: { Args: { '': string }; Returns: unknown }
      st_mpolyfromtext: { Args: { '': string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { '': string }; Returns: unknown }
      st_multipointfromtext: { Args: { '': string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { '': string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { '': string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { '': string }; Returns: unknown }
      st_polygonfromtext: { Args: { '': string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { '': string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { '': string }; Returns: number }
      update_project_boundary: {
        Args: {
          p_boundary: Json
          p_buffer_distances?: number[]
          p_center_point: Json
          p_county?: string
          p_grid_reference: string
          p_project_id: string
          p_province?: string
          p_townland?: string
          p_visible_layers?: string[]
        }
        Returns: {
          actual_end_date: string | null
          actual_start_date: string | null
          boundary: unknown
          budget_days: number | null
          buffer_distances: number[] | null
          center_point: unknown
          client_id: string | null
          county: string | null
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
          province: string | null
          site_code: string | null
          status: Database['public']['Enums']['project_status']
          survey_type: string | null
          townland: string | null
          updated_at: string
          visible_layers: string[] | null
        }
        SetofOptions: {
          from: '*'
          to: 'projects'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      upsert_project_site: {
        Args: {
          p_attributes?: Json
          p_boundary?: Json
          p_buffer_distances?: number[]
          p_center_point?: Json
          p_county?: string
          p_grid_reference?: string
          p_project_id: string
          p_province?: string
          p_site_code: string
          p_site_name?: string
          p_sort_order?: number
          p_townland?: string
          p_visible_layers?: string[]
        }
        Returns: string
      }
    }
    Enums: {
      audit_action: 'INSERT' | 'UPDATE' | 'DELETE'
      confidence_level: 'high' | 'medium' | 'low' | 'certain' | 'probable' | 'possible'
      data_source: 'npws' | 'gbif' | 'nbdc' | 'epa' | 'catchments' | 'manual' | 'company_reports'
      finding_data_type:
        | 'designated_site'
        | 'species_record'
        | 'water_quality'
        | 'catchment'
        | 'other'
        | 'company_report'
        | 'habitat'
      health_status: 'on_track' | 'at_risk' | 'overdue'
      project_member_role: 'lead' | 'surveyor' | 'analyst' | 'reviewer' | 'viewer' | 'member'
      project_phase: 'desk_research' | 'field_research' | 'reporting'
      project_status: 'draft' | 'active' | 'completed' | 'archived'
      report_status: 'draft' | 'internal_review' | 'client_review' | 'approved' | 'final'
      survey_status: 'in_progress' | 'completed'
      sync_status: 'synced' | 'pending' | 'conflict'
      user_role:
        | 'admin'
        | 'assessor'
        | 'client'
        | 'project_manager'
        | 'ecologist'
        | 'junior'
        | 'third_party'
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

export const Constants = {
  public: {
    Enums: {
      audit_action: ['INSERT', 'UPDATE', 'DELETE'],
      confidence_level: ['high', 'medium', 'low', 'certain', 'probable', 'possible'],
      data_source: ['npws', 'gbif', 'nbdc', 'epa', 'catchments', 'manual', 'company_reports'],
      finding_data_type: [
        'designated_site',
        'species_record',
        'water_quality',
        'catchment',
        'other',
        'company_report',
        'habitat',
      ],
      health_status: ['on_track', 'at_risk', 'overdue'],
      project_member_role: ['lead', 'surveyor', 'analyst', 'reviewer', 'viewer', 'member'],
      project_phase: ['desk_research', 'field_research', 'reporting'],
      project_status: ['draft', 'active', 'completed', 'archived'],
      report_status: ['draft', 'internal_review', 'client_review', 'approved', 'final'],
      survey_status: ['in_progress', 'completed'],
      sync_status: ['synced', 'pending', 'conflict'],
      user_role: [
        'admin',
        'assessor',
        'client',
        'project_manager',
        'ecologist',
        'junior',
        'third_party',
      ],
      workflow_status: ['pending', 'in_progress', 'needs_review', 'approved', 'blocked'],
    },
  },
} as const

// ─── Table aliases ──────────────────────────────────────────────────
export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']

export type WorkflowStep = Database['public']['Tables']['workflow_steps']['Row']
export type WorkflowStepInsert = Database['public']['Tables']['workflow_steps']['Insert']
export type WorkflowStepUpdate = Database['public']['Tables']['workflow_steps']['Update']

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Organization = Database['public']['Tables']['organizations']['Row']
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']
export type OrganizationUpdate = Database['public']['Tables']['organizations']['Update']

export type DeskResearchFinding = Database['public']['Tables']['desk_research_findings']['Row']
export type DeskResearchFindingInsert =
  Database['public']['Tables']['desk_research_findings']['Insert']
export type DeskResearchFindingUpdate =
  Database['public']['Tables']['desk_research_findings']['Update']

export type Survey = Database['public']['Tables']['surveys']['Row']
export type SurveyInsert = Database['public']['Tables']['surveys']['Insert']
export type SurveyUpdate = Database['public']['Tables']['surveys']['Update']

export type SpeciesObservation = Database['public']['Tables']['species_observations']['Row']
export type SpeciesObservationInsert =
  Database['public']['Tables']['species_observations']['Insert']
export type SpeciesObservationUpdate =
  Database['public']['Tables']['species_observations']['Update']

export type HabitatPolygon = Database['public']['Tables']['habitat_polygons']['Row']
export type HabitatPolygonInsert = Database['public']['Tables']['habitat_polygons']['Insert']
export type HabitatPolygonUpdate = Database['public']['Tables']['habitat_polygons']['Update']

export type TargetNote = Database['public']['Tables']['target_notes']['Row']
export type TargetNoteInsert = Database['public']['Tables']['target_notes']['Insert']
export type TargetNoteUpdate = Database['public']['Tables']['target_notes']['Update']

export type Report = Database['public']['Tables']['reports']['Row']
export type ReportInsert = Database['public']['Tables']['reports']['Insert']
export type ReportUpdate = Database['public']['Tables']['reports']['Update']

export type ProjectMember = Database['public']['Tables']['project_members']['Row']
export type ProjectMemberInsert = Database['public']['Tables']['project_members']['Insert']
export type ProjectMemberUpdate = Database['public']['Tables']['project_members']['Update']

export type Invite = Database['public']['Tables']['invites']['Row']
export type InviteInsert = Database['public']['Tables']['invites']['Insert']
export type InviteUpdate = Database['public']['Tables']['invites']['Update']

export type DeepResearchResult = Database['public']['Tables']['deep_research_results']['Row']
export type DeepResearchResultInsert =
  Database['public']['Tables']['deep_research_results']['Insert']
export type DeepResearchResultUpdate =
  Database['public']['Tables']['deep_research_results']['Update']

export type AquaticResearchResult = Database['public']['Tables']['aquatic_research_results']['Row']
export type AquaticResearchResultInsert =
  Database['public']['Tables']['aquatic_research_results']['Insert']
export type AquaticResearchResultUpdate =
  Database['public']['Tables']['aquatic_research_results']['Update']

export type Photo = Database['public']['Tables']['photos']['Row']
export type PhotoInsert = Database['public']['Tables']['photos']['Insert']
export type PhotoUpdate = Database['public']['Tables']['photos']['Update']

export type BaselineReportCache = Database['public']['Tables']['baseline_report_cache']['Row']
export type BaselineReportCacheInsert =
  Database['public']['Tables']['baseline_report_cache']['Insert']
export type BaselineReportCacheUpdate =
  Database['public']['Tables']['baseline_report_cache']['Update']

export type DropboxConnection = Database['public']['Tables']['dropbox_connections']['Row']
export type DropboxConnectionInsert = Database['public']['Tables']['dropbox_connections']['Insert']
export type DropboxConnectionUpdate = Database['public']['Tables']['dropbox_connections']['Update']

export type IndexedDocument = Database['public']['Tables']['indexed_documents']['Row']
export type IndexedDocumentInsert = Database['public']['Tables']['indexed_documents']['Insert']
export type IndexedDocumentUpdate = Database['public']['Tables']['indexed_documents']['Update']

export type DocumentChunk = Database['public']['Tables']['document_chunks']['Row']
export type DocumentChunkInsert = Database['public']['Tables']['document_chunks']['Insert']
export type DocumentChunkUpdate = Database['public']['Tables']['document_chunks']['Update']

export type DocumentChunkMention = Database['public']['Tables']['document_chunk_mentions']['Row']
export type DocumentChunkMentionInsert =
  Database['public']['Tables']['document_chunk_mentions']['Insert']
export type DocumentChunkMentionUpdate =
  Database['public']['Tables']['document_chunk_mentions']['Update']

export type ProjectSite = Database['public']['Tables']['project_sites']['Row']
export type ProjectSiteInsert = Database['public']['Tables']['project_sites']['Insert']
export type ProjectSiteUpdate = Database['public']['Tables']['project_sites']['Update']

// ─── Enum type aliases ──────────────────────────────────────────────
export type UserRole = Database['public']['Enums']['user_role']
export type ProjectStatus = Database['public']['Enums']['project_status']
export type ProjectPhase = Database['public']['Enums']['project_phase']
export type HealthStatus = Database['public']['Enums']['health_status']
export type WorkflowStatus = Database['public']['Enums']['workflow_status']
export type DataSource = Database['public']['Enums']['data_source']
export type FindingDataType = Database['public']['Enums']['finding_data_type']
export type SurveyStatus = Database['public']['Enums']['survey_status']
export type SyncStatus = Database['public']['Enums']['sync_status']
export type ConfidenceLevel = Database['public']['Enums']['confidence_level']
export type ProjectMemberRole = Database['public']['Enums']['project_member_role']
export type ReportStatus = Database['public']['Enums']['report_status']
export type AuditAction = Database['public']['Enums']['audit_action']

// ─── Custom types ───────────────────────────────────────────────────
export type TargetNoteCategory =
  | 'access_point'
  | 'check_feature'
  | 'habitat'
  | 'fauna'
  | 'flora'
  | 'management'
  | 'damage'
  | 'ownership'
export type TargetNotePriority = 'high' | 'normal' | 'low'

// ─── Generic helper types ───────────────────────────────────────────
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
