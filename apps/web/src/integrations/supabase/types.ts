export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_label: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          prev_hash: string | null
          row_hash: string
          seq: number
          source: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          prev_hash?: string | null
          row_hash: string
          seq: number
          source?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          prev_hash?: string | null
          row_hash?: string
          seq?: number
          source?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      asset_compliance_records: {
        Row: {
          assessed_at: string | null
          assessed_by: string | null
          asset_id: string
          control_id: string
          created_at: string | null
          evidence: string | null
          evidence_file_name: string | null
          evidence_url: string | null
          id: string
          justification: string | null
          notes: string | null
          status: Database["public"]["Enums"]["compliance_status"]
          updated_at: string | null
          valid_until: string | null
          verified_at: string | null
          verified_by: string | null
          verified_by_test_mapping_id: string | null
        }
        Insert: {
          assessed_at?: string | null
          assessed_by?: string | null
          asset_id: string
          control_id: string
          created_at?: string | null
          evidence?: string | null
          evidence_file_name?: string | null
          evidence_url?: string | null
          id?: string
          justification?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["compliance_status"]
          updated_at?: string | null
          valid_until?: string | null
          verified_at?: string | null
          verified_by?: string | null
          verified_by_test_mapping_id?: string | null
        }
        Update: {
          assessed_at?: string | null
          assessed_by?: string | null
          asset_id?: string
          control_id?: string
          created_at?: string | null
          evidence?: string | null
          evidence_file_name?: string | null
          evidence_url?: string | null
          id?: string
          justification?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["compliance_status"]
          updated_at?: string | null
          valid_until?: string | null
          verified_at?: string | null
          verified_by?: string | null
          verified_by_test_mapping_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_compliance_records_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "system_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_compliance_records_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "asset_controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_compliance_records_verified_by_test_mapping_id_fkey"
            columns: ["verified_by_test_mapping_id"]
            isOneToOne: false
            referencedRelation: "requirement_test_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_controls: {
        Row: {
          asset_model_filter: string[] | null
          asset_type_filter: string[] | null
          check_logic: Json | null
          control_category: Database["public"]["Enums"]["control_category"]
          created_at: string | null
          description: string | null
          id: string
          is_automated_check: boolean | null
          name: string
          priority: number | null
          source_requirement_id: string | null
          trigger_logic: Json | null
        }
        Insert: {
          asset_model_filter?: string[] | null
          asset_type_filter?: string[] | null
          check_logic?: Json | null
          control_category: Database["public"]["Enums"]["control_category"]
          created_at?: string | null
          description?: string | null
          id?: string
          is_automated_check?: boolean | null
          name: string
          priority?: number | null
          source_requirement_id?: string | null
          trigger_logic?: Json | null
        }
        Update: {
          asset_model_filter?: string[] | null
          asset_type_filter?: string[] | null
          check_logic?: Json | null
          control_category?: Database["public"]["Enums"]["control_category"]
          created_at?: string | null
          description?: string | null
          id?: string
          is_automated_check?: boolean | null
          name?: string
          priority?: number | null
          source_requirement_id?: string | null
          trigger_logic?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_controls_source_requirement_id_fkey"
            columns: ["source_requirement_id"]
            isOneToOne: false
            referencedRelation: "requirement_review_status"
            referencedColumns: ["requirement_id"]
          },
          {
            foreignKeyName: "asset_controls_source_requirement_id_fkey"
            columns: ["source_requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_chain_head: {
        Row: {
          hash: string
          id: boolean
          seq: number
        }
        Insert: {
          hash: string
          id?: boolean
          seq: number
        }
        Update: {
          hash?: string
          id?: boolean
          seq?: number
        }
        Relationships: []
      }
      class_sl_mapping: {
        Row: {
          classification_level: number
          description: string | null
          label: string
          target_sl: number
          updated_at: string
        }
        Insert: {
          classification_level: number
          description?: string | null
          label: string
          target_sl: number
          updated_at?: string
        }
        Update: {
          classification_level?: number
          description?: string | null
          label?: string
          target_sl?: number
          updated_at?: string
        }
        Relationships: []
      }
      compensating_measures: {
        Row: {
          asset_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          description: string
          facility_id: string | null
          id: string
          measure_type: Database["public"]["Enums"]["compensating_measure_type"]
          profile_item_id: string | null
          project_requirement_id: string | null
          proposed_by: Database["public"]["Enums"]["responsible_org"]
          status: Database["public"]["Enums"]["compensating_measure_status"]
          system_id: string | null
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          description: string
          facility_id?: string | null
          id?: string
          measure_type: Database["public"]["Enums"]["compensating_measure_type"]
          profile_item_id?: string | null
          project_requirement_id?: string | null
          proposed_by?: Database["public"]["Enums"]["responsible_org"]
          status?: Database["public"]["Enums"]["compensating_measure_status"]
          system_id?: string | null
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          description?: string
          facility_id?: string | null
          id?: string
          measure_type?: Database["public"]["Enums"]["compensating_measure_type"]
          profile_item_id?: string | null
          project_requirement_id?: string | null
          proposed_by?: Database["public"]["Enums"]["responsible_org"]
          status?: Database["public"]["Enums"]["compensating_measure_status"]
          system_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compensating_measures_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "system_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compensating_measures_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compensating_measures_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "system_classification"
            referencedColumns: ["driving_facility_id"]
          },
          {
            foreignKeyName: "compensating_measures_profile_item_id_fkey"
            columns: ["profile_item_id"]
            isOneToOne: false
            referencedRelation: "requirement_profile_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compensating_measures_project_requirement_id_fkey"
            columns: ["project_requirement_id"]
            isOneToOne: false
            referencedRelation: "project_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compensating_measures_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "information_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compensating_measures_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system_classification"
            referencedColumns: ["system_id"]
          },
        ]
      }
      compliance_records: {
        Row: {
          assessed_at: string | null
          assessed_by: string | null
          assigned_role: string | null
          created_at: string | null
          evidence: string | null
          evidence_file_name: string | null
          evidence_url: string | null
          facility_id: string | null
          id: string
          justification: string | null
          notes: string | null
          out_of_scope_reason: string | null
          out_of_scope_since: string | null
          requirement_id: string | null
          status: Database["public"]["Enums"]["compliance_status"]
          updated_at: string | null
          valid_until: string | null
          verified_by_test_mapping_id: string | null
        }
        Insert: {
          assessed_at?: string | null
          assessed_by?: string | null
          assigned_role?: string | null
          created_at?: string | null
          evidence?: string | null
          evidence_file_name?: string | null
          evidence_url?: string | null
          facility_id?: string | null
          id?: string
          justification?: string | null
          notes?: string | null
          out_of_scope_reason?: string | null
          out_of_scope_since?: string | null
          requirement_id?: string | null
          status?: Database["public"]["Enums"]["compliance_status"]
          updated_at?: string | null
          valid_until?: string | null
          verified_by_test_mapping_id?: string | null
        }
        Update: {
          assessed_at?: string | null
          assessed_by?: string | null
          assigned_role?: string | null
          created_at?: string | null
          evidence?: string | null
          evidence_file_name?: string | null
          evidence_url?: string | null
          facility_id?: string | null
          id?: string
          justification?: string | null
          notes?: string | null
          out_of_scope_reason?: string | null
          out_of_scope_since?: string | null
          requirement_id?: string | null
          status?: Database["public"]["Enums"]["compliance_status"]
          updated_at?: string | null
          valid_until?: string | null
          verified_by_test_mapping_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_records_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_records_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "system_classification"
            referencedColumns: ["driving_facility_id"]
          },
          {
            foreignKeyName: "compliance_records_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirement_review_status"
            referencedColumns: ["requirement_id"]
          },
          {
            foreignKeyName: "compliance_records_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_records_verified_by_test_mapping_id_fkey"
            columns: ["verified_by_test_mapping_id"]
            isOneToOne: false
            referencedRelation: "requirement_test_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      component_compliance_records: {
        Row: {
          assessed_at: string | null
          assessed_by: string | null
          asset_id: string
          created_at: string
          evidence: string | null
          evidence_file_name: string | null
          evidence_url: string | null
          id: string
          inherited_justification: string | null
          justification: string | null
          notes: string | null
          out_of_scope_reason: string | null
          out_of_scope_since: string | null
          profile_id: string | null
          profile_item_id: string | null
          requirement_id: string
          status: Database["public"]["Enums"]["compliance_status"]
          updated_at: string
          valid_until: string | null
          verified_by_test_mapping_id: string | null
        }
        Insert: {
          assessed_at?: string | null
          assessed_by?: string | null
          asset_id: string
          created_at?: string
          evidence?: string | null
          evidence_file_name?: string | null
          evidence_url?: string | null
          id?: string
          inherited_justification?: string | null
          justification?: string | null
          notes?: string | null
          out_of_scope_reason?: string | null
          out_of_scope_since?: string | null
          profile_id?: string | null
          profile_item_id?: string | null
          requirement_id: string
          status?: Database["public"]["Enums"]["compliance_status"]
          updated_at?: string
          valid_until?: string | null
          verified_by_test_mapping_id?: string | null
        }
        Update: {
          assessed_at?: string | null
          assessed_by?: string | null
          asset_id?: string
          created_at?: string
          evidence?: string | null
          evidence_file_name?: string | null
          evidence_url?: string | null
          id?: string
          inherited_justification?: string | null
          justification?: string | null
          notes?: string | null
          out_of_scope_reason?: string | null
          out_of_scope_since?: string | null
          profile_id?: string | null
          profile_item_id?: string | null
          requirement_id?: string
          status?: Database["public"]["Enums"]["compliance_status"]
          updated_at?: string
          valid_until?: string | null
          verified_by_test_mapping_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "component_compliance_records_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "system_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_compliance_records_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "requirement_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_compliance_records_profile_item_id_fkey"
            columns: ["profile_item_id"]
            isOneToOne: false
            referencedRelation: "requirement_profile_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_compliance_records_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirement_review_status"
            referencedColumns: ["requirement_id"]
          },
          {
            foreignKeyName: "component_compliance_records_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_compliance_records_verified_by_test_mapping_id_fkey"
            columns: ["verified_by_test_mapping_id"]
            isOneToOne: false
            referencedRelation: "requirement_test_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      component_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          manufacturer: string | null
          model: string | null
          name: string
          system_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          manufacturer?: string | null
          model?: string | null
          name: string
          system_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          manufacturer?: string | null
          model?: string | null
          name?: string
          system_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "component_types_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "information_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_types_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system_classification"
            referencedColumns: ["system_id"]
          },
        ]
      }
      domain_checklists: {
        Row: {
          action_items: Json | null
          created_at: string | null
          description: string | null
          domain_id: string | null
          id: string
          priority: number | null
          title: string
        }
        Insert: {
          action_items?: Json | null
          created_at?: string | null
          description?: string | null
          domain_id?: string | null
          id?: string
          priority?: number | null
          title: string
        }
        Update: {
          action_items?: Json | null
          created_at?: string | null
          description?: string | null
          domain_id?: string | null
          id?: string
          priority?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_checklists_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "security_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      export_history: {
        Row: {
          created_at: string
          export_id: string
          file_name: string
          filters: Json | null
          id: string
          requirements_snapshot: Json | null
          row_counts: Json | null
          scope_key: Json | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          export_id: string
          file_name: string
          filters?: Json | null
          id?: string
          requirements_snapshot?: Json | null
          row_counts?: Json | null
          scope_key?: Json | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          export_id?: string
          file_name?: string
          filters?: Json | null
          id?: string
          requirements_snapshot?: Json | null
          row_counts?: Json | null
          scope_key?: Json | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      facilities: {
        Row: {
          classification_level: number | null
          construction_type:
            | Database["public"]["Enums"]["construction_type"]
            | null
          created_at: string | null
          has_dangerous_goods: boolean | null
          id: string
          is_critical_entity: boolean | null
          length_meters: number | null
          name: string
          owner_type: string | null
          traffic_flow_adt: number | null
          type: Database["public"]["Enums"]["facility_type"]
          updated_at: string | null
        }
        Insert: {
          classification_level?: number | null
          construction_type?:
            | Database["public"]["Enums"]["construction_type"]
            | null
          created_at?: string | null
          has_dangerous_goods?: boolean | null
          id?: string
          is_critical_entity?: boolean | null
          length_meters?: number | null
          name: string
          owner_type?: string | null
          traffic_flow_adt?: number | null
          type: Database["public"]["Enums"]["facility_type"]
          updated_at?: string | null
        }
        Update: {
          classification_level?: number | null
          construction_type?:
            | Database["public"]["Enums"]["construction_type"]
            | null
          created_at?: string | null
          has_dangerous_goods?: boolean | null
          id?: string
          is_critical_entity?: boolean | null
          length_meters?: number | null
          name?: string
          owner_type?: string | null
          traffic_flow_adt?: number | null
          type?: Database["public"]["Enums"]["facility_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      facility_systems: {
        Row: {
          created_at: string | null
          criticality: Database["public"]["Enums"]["system_criticality"]
          facility_id: string
          id: string
          is_primary: boolean
          notes: string | null
          relation_type: Database["public"]["Enums"]["system_relation_type"]
          system_id: string
        }
        Insert: {
          created_at?: string | null
          criticality?: Database["public"]["Enums"]["system_criticality"]
          facility_id: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          relation_type?: Database["public"]["Enums"]["system_relation_type"]
          system_id: string
        }
        Update: {
          created_at?: string | null
          criticality?: Database["public"]["Enums"]["system_criticality"]
          facility_id?: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          relation_type?: Database["public"]["Enums"]["system_relation_type"]
          system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_systems_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_systems_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "system_classification"
            referencedColumns: ["driving_facility_id"]
          },
          {
            foreignKeyName: "facility_systems_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "information_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_systems_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system_classification"
            referencedColumns: ["system_id"]
          },
        ]
      }
      ingestion_jobs: {
        Row: {
          created_at: string
          created_by: string
          document_name: string
          done_chunks: number
          error: string | null
          file_path: string
          id: string
          language: string | null
          model: string | null
          result: Json | null
          status: string
          total_chunks: number | null
          total_pages: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          document_name: string
          done_chunks?: number
          error?: string | null
          file_path: string
          id?: string
          language?: string | null
          model?: string | null
          result?: Json | null
          status?: string
          total_chunks?: number | null
          total_pages?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          document_name?: string
          done_chunks?: number
          error?: string | null
          file_path?: string
          id?: string
          language?: string | null
          model?: string | null
          result?: Json | null
          status?: string
          total_chunks?: number | null
          total_pages?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      information_systems: {
        Row: {
          classification_source: Database["public"]["Enums"]["classification_source"]
          created_at: string | null
          description: string | null
          facility_class_override: number | null
          id: string
          is_central_system: boolean | null
          is_critical_entity: boolean | null
          is_externally_accessible: boolean | null
          name: string
          override_reason: string | null
          own_classification_level: number | null
          owner_type: string | null
          system_category: Database["public"]["Enums"]["system_category"] | null
          system_owner: string | null
          system_type: string
          updated_at: string | null
        }
        Insert: {
          classification_source?: Database["public"]["Enums"]["classification_source"]
          created_at?: string | null
          description?: string | null
          facility_class_override?: number | null
          id?: string
          is_central_system?: boolean | null
          is_critical_entity?: boolean | null
          is_externally_accessible?: boolean | null
          name: string
          override_reason?: string | null
          own_classification_level?: number | null
          owner_type?: string | null
          system_category?:
            | Database["public"]["Enums"]["system_category"]
            | null
          system_owner?: string | null
          system_type: string
          updated_at?: string | null
        }
        Update: {
          classification_source?: Database["public"]["Enums"]["classification_source"]
          created_at?: string | null
          description?: string | null
          facility_class_override?: number | null
          id?: string
          is_central_system?: boolean | null
          is_critical_entity?: boolean | null
          is_externally_accessible?: boolean | null
          name?: string
          override_reason?: string | null
          own_classification_level?: number | null
          owner_type?: string | null
          system_category?:
            | Database["public"]["Enums"]["system_category"]
            | null
          system_owner?: string | null
          system_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      installation_settings: {
        Row: {
          ai_compliance_analysis: boolean
          id: number
          role: string
          trusted_key_id: string | null
          trusted_public_key: string | null
          updated_at: string
        }
        Insert: {
          ai_compliance_analysis?: boolean
          id?: number
          role?: string
          trusted_key_id?: string | null
          trusted_public_key?: string | null
          updated_at?: string
        }
        Update: {
          ai_compliance_analysis?: boolean
          id?: number
          role?: string
          trusted_key_id?: string | null
          trusted_public_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      procurement_projects: {
        Row: {
          component_type_id: string | null
          created_at: string
          description: string | null
          facility_id: string | null
          id: string
          name: string
          owner_name: string | null
          status: Database["public"]["Enums"]["project_status"]
          supplier_name: string | null
          system_id: string | null
          target_sl: number | null
          unit_count: number | null
          updated_at: string
        }
        Insert: {
          component_type_id?: string | null
          created_at?: string
          description?: string | null
          facility_id?: string | null
          id?: string
          name: string
          owner_name?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          supplier_name?: string | null
          system_id?: string | null
          target_sl?: number | null
          unit_count?: number | null
          updated_at?: string
        }
        Update: {
          component_type_id?: string | null
          created_at?: string
          description?: string | null
          facility_id?: string | null
          id?: string
          name?: string
          owner_name?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          supplier_name?: string | null
          system_id?: string | null
          target_sl?: number | null
          unit_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procurement_projects_component_type_id_fkey"
            columns: ["component_type_id"]
            isOneToOne: false
            referencedRelation: "component_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_projects_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_projects_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "system_classification"
            referencedColumns: ["driving_facility_id"]
          },
          {
            foreignKeyName: "procurement_projects_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "information_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_projects_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system_classification"
            referencedColumns: ["system_id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved: boolean
          created_at: string
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      project_requirements: {
        Row: {
          applicability: Database["public"]["Enums"]["requirement_applicability"]
          created_at: string
          id: string
          justification: string | null
          project_id: string
          requirement_id: string
        }
        Insert: {
          applicability?: Database["public"]["Enums"]["requirement_applicability"]
          created_at?: string
          id?: string
          justification?: string | null
          project_id: string
          requirement_id: string
        }
        Update: {
          applicability?: Database["public"]["Enums"]["requirement_applicability"]
          created_at?: string
          id?: string
          justification?: string | null
          project_id?: string
          requirement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "procurement_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_requirements_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirement_review_status"
            referencedColumns: ["requirement_id"]
          },
          {
            foreignKeyName: "project_requirements_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          changed_by: string
          created_at: string
          id: string
          new_value: Json | null
          old_value: Json | null
          requirement_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          changed_by: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          requirement_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          changed_by?: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          requirement_id?: string
        }
        Relationships: []
      }
      requirement_catalog_releases: {
        Row: {
          counts: Json
          created_at: string
          created_by: string | null
          direction: string
          id: string
          notes: string | null
          package_created_at: string | null
          sha256: string
          signature_key_id: string | null
          signature_verified: boolean | null
          version: number
        }
        Insert: {
          counts?: Json
          created_at?: string
          created_by?: string | null
          direction: string
          id?: string
          notes?: string | null
          package_created_at?: string | null
          sha256: string
          signature_key_id?: string | null
          signature_verified?: boolean | null
          version: number
        }
        Update: {
          counts?: Json
          created_at?: string
          created_by?: string | null
          direction?: string
          id?: string
          notes?: string | null
          package_created_at?: string | null
          sha256?: string
          signature_key_id?: string | null
          signature_verified?: boolean | null
          version?: number
        }
        Relationships: []
      }
      requirement_domain_suggestions: {
        Row: {
          confidence: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decided_domain_id: string | null
          domain_id: string
          id: string
          rationale: string | null
          requirement_id: string
          status: string
          suggested_by: string
        }
        Insert: {
          confidence: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decided_domain_id?: string | null
          domain_id: string
          id?: string
          rationale?: string | null
          requirement_id: string
          status?: string
          suggested_by: string
        }
        Update: {
          confidence?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decided_domain_id?: string | null
          domain_id?: string
          id?: string
          rationale?: string | null
          requirement_id?: string
          status?: string
          suggested_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirement_domain_suggestions_decided_domain_id_fkey"
            columns: ["decided_domain_id"]
            isOneToOne: false
            referencedRelation: "security_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirement_domain_suggestions_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "security_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirement_domain_suggestions_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirement_review_status"
            referencedColumns: ["requirement_id"]
          },
          {
            foreignKeyName: "requirement_domain_suggestions_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_links: {
        Row: {
          child_requirement_id: string
          confidence: string | null
          coverage: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          is_local: boolean
          link_type: string
          parent_requirement_id: string
          rationale: string | null
          status: string
          suggested_by: string
        }
        Insert: {
          child_requirement_id: string
          confidence?: string | null
          coverage?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          is_local?: boolean
          link_type?: string
          parent_requirement_id: string
          rationale?: string | null
          status?: string
          suggested_by: string
        }
        Update: {
          child_requirement_id?: string
          confidence?: string | null
          coverage?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          is_local?: boolean
          link_type?: string
          parent_requirement_id?: string
          rationale?: string | null
          status?: string
          suggested_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirement_links_child_requirement_id_fkey"
            columns: ["child_requirement_id"]
            isOneToOne: false
            referencedRelation: "requirement_review_status"
            referencedColumns: ["requirement_id"]
          },
          {
            foreignKeyName: "requirement_links_child_requirement_id_fkey"
            columns: ["child_requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirement_links_parent_requirement_id_fkey"
            columns: ["parent_requirement_id"]
            isOneToOne: false
            referencedRelation: "requirement_review_status"
            referencedColumns: ["requirement_id"]
          },
          {
            foreignKeyName: "requirement_links_parent_requirement_id_fkey"
            columns: ["parent_requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_profile_items: {
        Row: {
          applicability: Database["public"]["Enums"]["requirement_applicability"]
          id: string
          justification: string | null
          profile_id: string
          requirement_id: string
        }
        Insert: {
          applicability?: Database["public"]["Enums"]["requirement_applicability"]
          id?: string
          justification?: string | null
          profile_id: string
          requirement_id: string
        }
        Update: {
          applicability?: Database["public"]["Enums"]["requirement_applicability"]
          id?: string
          justification?: string | null
          profile_id?: string
          requirement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirement_profile_items_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "requirement_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirement_profile_items_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirement_review_status"
            referencedColumns: ["requirement_id"]
          },
          {
            foreignKeyName: "requirement_profile_items_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_profiles: {
        Row: {
          component_type_id: string | null
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          target_sl: number | null
        }
        Insert: {
          component_type_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          target_sl?: number | null
        }
        Update: {
          component_type_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          target_sl?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "requirement_profiles_component_type_id_fkey"
            columns: ["component_type_id"]
            isOneToOne: false
            referencedRelation: "component_types"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_reviews: {
        Row: {
          actor_user_id: string | null
          batch_id: string | null
          comment: string | null
          content_hash: string | null
          created_at: string
          id: string
          requirement_id: string
          reviewed_by: string
          status: Database["public"]["Enums"]["review_status"]
        }
        Insert: {
          actor_user_id?: string | null
          batch_id?: string | null
          comment?: string | null
          content_hash?: string | null
          created_at?: string
          id?: string
          requirement_id: string
          reviewed_by: string
          status?: Database["public"]["Enums"]["review_status"]
        }
        Update: {
          actor_user_id?: string | null
          batch_id?: string | null
          comment?: string | null
          content_hash?: string | null
          created_at?: string
          id?: string
          requirement_id?: string
          reviewed_by?: string
          status?: Database["public"]["Enums"]["review_status"]
        }
        Relationships: [
          {
            foreignKeyName: "requirement_reviews_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "review_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_sources: {
        Row: {
          addressee: Database["public"]["Enums"]["requirement_addressee"]
          category: Database["public"]["Enums"]["requirement_category"]
          created_at: string | null
          description: string | null
          document_name: string
          document_url: string | null
          id: string
          is_local: boolean
          measure_scale: Database["public"]["Enums"]["measure_scale"]
          source_level: Database["public"]["Enums"]["source_level"] | null
        }
        Insert: {
          addressee?: Database["public"]["Enums"]["requirement_addressee"]
          category: Database["public"]["Enums"]["requirement_category"]
          created_at?: string | null
          description?: string | null
          document_name: string
          document_url?: string | null
          id?: string
          is_local?: boolean
          measure_scale?: Database["public"]["Enums"]["measure_scale"]
          source_level?: Database["public"]["Enums"]["source_level"] | null
        }
        Update: {
          addressee?: Database["public"]["Enums"]["requirement_addressee"]
          category?: Database["public"]["Enums"]["requirement_category"]
          created_at?: string | null
          description?: string | null
          document_name?: string
          document_url?: string | null
          id?: string
          is_local?: boolean
          measure_scale?: Database["public"]["Enums"]["measure_scale"]
          source_level?: Database["public"]["Enums"]["source_level"] | null
        }
        Relationships: []
      }
      requirement_test_mappings: {
        Row: {
          acceptance_criteria: string | null
          asset_id: string | null
          comment: string | null
          created_at: string
          deviation: string | null
          evidence: string | null
          evidence_file_name: string | null
          evidence_url: string | null
          id: string
          is_applicable: boolean | null
          project_id: string | null
          requirement_id: string
          responsible_org: Database["public"]["Enums"]["responsible_org"] | null
          responsible_party: string | null
          result_status: Database["public"]["Enums"]["test_result_status"]
          suggestion_dismiss_reason: string | null
          suggestion_dismissed_at: string | null
          suggestion_dismissed_by: string | null
          system_id: string | null
          test_method: string | null
          test_phase: Database["public"]["Enums"]["test_phase"] | null
          test_type: Database["public"]["Enums"]["test_type"] | null
          testability: Database["public"]["Enums"]["testability"] | null
          tested_at: string | null
          tested_by: string | null
          updated_at: string
        }
        Insert: {
          acceptance_criteria?: string | null
          asset_id?: string | null
          comment?: string | null
          created_at?: string
          deviation?: string | null
          evidence?: string | null
          evidence_file_name?: string | null
          evidence_url?: string | null
          id?: string
          is_applicable?: boolean | null
          project_id?: string | null
          requirement_id: string
          responsible_org?:
            | Database["public"]["Enums"]["responsible_org"]
            | null
          responsible_party?: string | null
          result_status?: Database["public"]["Enums"]["test_result_status"]
          suggestion_dismiss_reason?: string | null
          suggestion_dismissed_at?: string | null
          suggestion_dismissed_by?: string | null
          system_id?: string | null
          test_method?: string | null
          test_phase?: Database["public"]["Enums"]["test_phase"] | null
          test_type?: Database["public"]["Enums"]["test_type"] | null
          testability?: Database["public"]["Enums"]["testability"] | null
          tested_at?: string | null
          tested_by?: string | null
          updated_at?: string
        }
        Update: {
          acceptance_criteria?: string | null
          asset_id?: string | null
          comment?: string | null
          created_at?: string
          deviation?: string | null
          evidence?: string | null
          evidence_file_name?: string | null
          evidence_url?: string | null
          id?: string
          is_applicable?: boolean | null
          project_id?: string | null
          requirement_id?: string
          responsible_org?:
            | Database["public"]["Enums"]["responsible_org"]
            | null
          responsible_party?: string | null
          result_status?: Database["public"]["Enums"]["test_result_status"]
          suggestion_dismiss_reason?: string | null
          suggestion_dismissed_at?: string | null
          suggestion_dismissed_by?: string | null
          system_id?: string | null
          test_method?: string | null
          test_phase?: Database["public"]["Enums"]["test_phase"] | null
          test_type?: Database["public"]["Enums"]["test_type"] | null
          testability?: Database["public"]["Enums"]["testability"] | null
          tested_at?: string | null
          tested_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirement_test_mappings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "system_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirement_test_mappings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "procurement_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirement_test_mappings_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirement_review_status"
            referencedColumns: ["requirement_id"]
          },
          {
            foreignKeyName: "requirement_test_mappings_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirement_test_mappings_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "information_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirement_test_mappings_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system_classification"
            referencedColumns: ["system_id"]
          },
        ]
      }
      requirements: {
        Row: {
          chapter_section: string
          content_changed_at: string
          created_at: string | null
          description: string
          domain_id: string | null
          id: string
          is_general_advice: boolean | null
          is_local: boolean
          min_classification_level: number
          ml_capability: number | null
          repealed_at: string | null
          requirement_level:
            | Database["public"]["Enums"]["requirement_level"]
            | null
          sl_capability: number | null
          source_excerpt: string | null
          source_id: string | null
          source_page: number | null
          target_type: string | null
          trigger_logic: Json | null
        }
        Insert: {
          chapter_section: string
          content_changed_at?: string
          created_at?: string | null
          description: string
          domain_id?: string | null
          id?: string
          is_general_advice?: boolean | null
          is_local?: boolean
          min_classification_level?: number
          ml_capability?: number | null
          repealed_at?: string | null
          requirement_level?:
            | Database["public"]["Enums"]["requirement_level"]
            | null
          sl_capability?: number | null
          source_excerpt?: string | null
          source_id?: string | null
          source_page?: number | null
          target_type?: string | null
          trigger_logic?: Json | null
        }
        Update: {
          chapter_section?: string
          content_changed_at?: string
          created_at?: string | null
          description?: string
          domain_id?: string | null
          id?: string
          is_general_advice?: boolean | null
          is_local?: boolean
          min_classification_level?: number
          ml_capability?: number | null
          repealed_at?: string | null
          requirement_level?:
            | Database["public"]["Enums"]["requirement_level"]
            | null
          sl_capability?: number | null
          source_excerpt?: string | null
          source_id?: string | null
          source_page?: number | null
          target_type?: string | null
          trigger_logic?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "requirements_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "security_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirements_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "requirement_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      review_batches: {
        Row: {
          actor_user_id: string | null
          batch_no: string
          created_at: string
          created_by: string
          filters: Json | null
          id: string
          requirement_ids: string[]
        }
        Insert: {
          actor_user_id?: string | null
          batch_no: string
          created_at?: string
          created_by: string
          filters?: Json | null
          id?: string
          requirement_ids: string[]
        }
        Update: {
          actor_user_id?: string | null
          batch_no?: string
          created_at?: string
          created_by?: string
          filters?: Json | null
          id?: string
          requirement_ids?: string[]
        }
        Relationships: []
      }
      scoring_thresholds: {
        Row: {
          description: string | null
          key: string
          label: string
          updated_at: string
          value: number
        }
        Insert: {
          description?: string | null
          key: string
          label: string
          updated_at?: string
          value: number
        }
        Update: {
          description?: string | null
          key?: string
          label?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      security_domains: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_local: boolean
          name: string
          priority_order: number | null
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_local?: boolean
          name: string
          priority_order?: number | null
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_local?: boolean
          name?: string
          priority_order?: number | null
          slug?: string
        }
        Relationships: []
      }
      system_assets: {
        Row: {
          asset_type: string
          component_type_id: string | null
          created_at: string | null
          criticality: Database["public"]["Enums"]["asset_criticality"] | null
          eol_date: string | null
          eos_date: string | null
          firmware_version: string | null
          id: string
          is_vendor_managed: boolean | null
          last_patched_at: string | null
          location: string | null
          manufacturer: string | null
          model: string | null
          name: string
          network_zone: string | null
          notes: string | null
          system_id: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          asset_type: string
          component_type_id?: string | null
          created_at?: string | null
          criticality?: Database["public"]["Enums"]["asset_criticality"] | null
          eol_date?: string | null
          eos_date?: string | null
          firmware_version?: string | null
          id?: string
          is_vendor_managed?: boolean | null
          last_patched_at?: string | null
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          name: string
          network_zone?: string | null
          notes?: string | null
          system_id: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          asset_type?: string
          component_type_id?: string | null
          created_at?: string | null
          criticality?: Database["public"]["Enums"]["asset_criticality"] | null
          eol_date?: string | null
          eos_date?: string | null
          firmware_version?: string | null
          id?: string
          is_vendor_managed?: boolean | null
          last_patched_at?: string | null
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          network_zone?: string | null
          notes?: string | null
          system_id?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_assets_component_type_id_fkey"
            columns: ["component_type_id"]
            isOneToOne: false
            referencedRelation: "component_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_assets_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "information_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_assets_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system_classification"
            referencedColumns: ["system_id"]
          },
        ]
      }
      system_compliance_records: {
        Row: {
          assessed_at: string | null
          assessed_by: string | null
          assigned_role: string | null
          created_at: string | null
          evidence: string | null
          evidence_file_name: string | null
          evidence_url: string | null
          id: string
          justification: string | null
          notes: string | null
          out_of_scope_reason: string | null
          out_of_scope_since: string | null
          requirement_id: string
          status: Database["public"]["Enums"]["compliance_status"]
          system_id: string
          updated_at: string | null
          valid_until: string | null
          verified_by_test_mapping_id: string | null
        }
        Insert: {
          assessed_at?: string | null
          assessed_by?: string | null
          assigned_role?: string | null
          created_at?: string | null
          evidence?: string | null
          evidence_file_name?: string | null
          evidence_url?: string | null
          id?: string
          justification?: string | null
          notes?: string | null
          out_of_scope_reason?: string | null
          out_of_scope_since?: string | null
          requirement_id: string
          status?: Database["public"]["Enums"]["compliance_status"]
          system_id: string
          updated_at?: string | null
          valid_until?: string | null
          verified_by_test_mapping_id?: string | null
        }
        Update: {
          assessed_at?: string | null
          assessed_by?: string | null
          assigned_role?: string | null
          created_at?: string | null
          evidence?: string | null
          evidence_file_name?: string | null
          evidence_url?: string | null
          id?: string
          justification?: string | null
          notes?: string | null
          out_of_scope_reason?: string | null
          out_of_scope_since?: string | null
          requirement_id?: string
          status?: Database["public"]["Enums"]["compliance_status"]
          system_id?: string
          updated_at?: string | null
          valid_until?: string | null
          verified_by_test_mapping_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_compliance_records_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirement_review_status"
            referencedColumns: ["requirement_id"]
          },
          {
            foreignKeyName: "system_compliance_records_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_compliance_records_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "information_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_compliance_records_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system_classification"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "system_compliance_records_verified_by_test_mapping_id_fkey"
            columns: ["verified_by_test_mapping_id"]
            isOneToOne: false
            referencedRelation: "requirement_test_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      test_mapping_notes: {
        Row: {
          author_email: string | null
          created_at: string
          id: string
          mapping_id: string
          note: string
        }
        Insert: {
          author_email?: string | null
          created_at?: string
          id?: string
          mapping_id: string
          note: string
        }
        Update: {
          author_email?: string | null
          created_at?: string
          id?: string
          mapping_id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_mapping_notes_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "requirement_test_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      compliance_domain_metrics: {
        Row: {
          assessed: number | null
          compliance: number | null
          coverage: number | null
          domain_id: string | null
          expired: number | null
          fulfilled: number | null
          not_applicable: number | null
          object_id: string | null
          object_type: string | null
          total: number | null
        }
        Relationships: []
      }
      compliance_object_metrics: {
        Row: {
          assessed: number | null
          compliance: number | null
          coverage: number | null
          expired: number | null
          fulfilled: number | null
          in_progress: number | null
          needs_action: number | null
          not_applicable: number | null
          not_fulfilled: number | null
          not_started: number | null
          object_id: string | null
          object_type: string | null
          out_of_scope: number | null
          partially_fulfilled: number | null
          total: number | null
        }
        Relationships: []
      }
      compliance_record_scope: {
        Row: {
          domain_id: string | null
          in_scope: boolean | null
          is_assessed: boolean | null
          is_expired: boolean | null
          is_fulfilled: boolean | null
          is_not_applicable: boolean | null
          object_id: string | null
          object_type: string | null
          out_of_scope_since: string | null
          record_id: string | null
          requirement_id: string | null
          status: Database["public"]["Enums"]["compliance_status"] | null
          valid_until: string | null
        }
        Relationships: []
      }
      component_requirement_metrics: {
        Row: {
          assessed: number | null
          compliance: number | null
          component_count: number | null
          coverage: number | null
          expired: number | null
          fulfilled: number | null
          not_applicable: number | null
          out_of_scope: number | null
          system_id: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "system_assets_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "information_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_assets_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system_classification"
            referencedColumns: ["system_id"]
          },
        ]
      }
      facility_rollup_metrics: {
        Row: {
          assessed: number | null
          compliance: number | null
          coverage: number | null
          expired: number | null
          facility_id: string | null
          fulfilled: number | null
          linked_systems: number | null
          needs_action: number | null
          not_applicable: number | null
          out_of_scope: number | null
          own_total: number | null
          systems_total: number | null
          total: number | null
        }
        Relationships: []
      }
      requirement_link_details: {
        Row: {
          child_level: Database["public"]["Enums"]["source_level"] | null
          child_requirement_id: string | null
          child_section: string | null
          child_source: string | null
          coverage: string | null
          decided_at: string | null
          decided_by: string | null
          id: string | null
          link_type: string | null
          parent_level: Database["public"]["Enums"]["source_level"] | null
          parent_requirement_id: string | null
          parent_section: string | null
          parent_source: string | null
          rationale: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requirement_links_child_requirement_id_fkey"
            columns: ["child_requirement_id"]
            isOneToOne: false
            referencedRelation: "requirement_review_status"
            referencedColumns: ["requirement_id"]
          },
          {
            foreignKeyName: "requirement_links_child_requirement_id_fkey"
            columns: ["child_requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirement_links_parent_requirement_id_fkey"
            columns: ["parent_requirement_id"]
            isOneToOne: false
            referencedRelation: "requirement_review_status"
            referencedColumns: ["requirement_id"]
          },
          {
            foreignKeyName: "requirement_links_parent_requirement_id_fkey"
            columns: ["parent_requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_review_status: {
        Row: {
          batch_id: string | null
          comment: string | null
          last_status: string | null
          requirement_id: string | null
          review_state: string | null
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requirement_reviews_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "review_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      system_classification: {
        Row: {
          driving_facility_id: string | null
          driving_facility_name: string | null
          effective_level: number | null
          inherited_level: number | null
          is_deviation: boolean | null
          is_missing: boolean | null
          linked_facilities: number | null
          override_level: number | null
          override_reason: string | null
          own_level: number | null
          source: Database["public"]["Enums"]["classification_source"] | null
          system_id: string | null
          target_sl: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _current_email: { Args: never; Returns: string }
      activity_row_hash: {
        Args: {
          _action: string
          _created_at: string
          _entity_id: string
          _entity_label: string
          _entity_type: string
          _metadata: Json
          _prev_hash: string
          _seq: number
          _source: string
          _user_email: string
          _user_id: string
        }
        Returns: string
      }
      applicable_requirements_for_facility_attrs: {
        Args: { _attrs: Json }
        Returns: string[]
      }
      apply_profile_to_project: {
        Args: { _profile_id: string; _project_id: string }
        Returns: number
      }
      clean_sheet_value: { Args: { _v: string }; Returns: string }
      compliance_record_is_untouched: {
        Args: {
          _evidence: string
          _evidence_file_name: string
          _evidence_url: string
          _justification: string
          _notes: string
          _status: Database["public"]["Enums"]["compliance_status"]
          _verified_by: string
        }
        Returns: boolean
      }
      component_record_is_untouched: {
        Args: {
          c: Database["public"]["Tables"]["component_compliance_records"]["Row"]
        }
        Returns: boolean
      }
      copy_requirement_profile: {
        Args: { _name: string; _profile_id: string }
        Returns: string
      }
      create_review_batch: {
        Args: { _filters?: Json; _requirement_ids: string[] }
        Returns: {
          actor_user_id: string | null
          batch_no: string
          created_at: string
          created_by: string
          filters: Json | null
          id: string
          requirement_ids: string[]
        }
        SetofOptions: {
          from: "*"
          to: "review_batches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decide_domain_suggestions: {
        Args: {
          _approve: boolean
          _domain_id?: string
          _suggestion_ids: string[]
        }
        Returns: number
      }
      decide_requirement_links: {
        Args: { _approve: boolean; _coverage?: string; _link_ids: string[] }
        Returns: number
      }
      effective_system_class: { Args: { _system_id: string }; Returns: number }
      export_requirement_catalog: {
        Args: { _notes?: string }
        Returns: {
          content: string
          sha256: string
          version: number
        }[]
      }
      export_requirement_diff: { Args: { _filters: Json }; Returns: Json }
      export_scope_key: { Args: { _filters: Json }; Returns: Json }
      get_applicable_requirements: {
        Args: { object_id: string; object_type: string }
        Returns: {
          inherited: boolean
          inherited_from_facility_id: string
          requirement_id: string
        }[]
      }
      get_requirement_matches: {
        Args: { _requirement_id: string }
        Returns: {
          inherited_from_facility_id: string
          object_id: string
          object_type: string
        }[]
      }
      guess_source_level: {
        Args: { _name: string }
        Returns: Database["public"]["Enums"]["source_level"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_requirement_catalog: {
        Args: {
          _content: string
          _sha256: string
          _signature_key_id?: string
          _signature_verified?: boolean
        }
        Returns: Json
      }
      import_requirement_link_rows: {
        Args: {
          _apply?: boolean
          _file_name?: string
          _law_source_id: string
          _regulation_source_id: string
          _rows: Json
          _standard_source_id: string
        }
        Returns: Json
      }
      inherited_system_class: { Args: { _system_id: string }; Returns: number }
      is_approved: { Args: never; Returns: boolean }
      jsonb_bool: { Args: { v: Json }; Returns: boolean }
      jsonb_changes: { Args: { _new: Json; _old: Json }; Returns: Json }
      jsonb_has_text: { Args: { t: string; v: Json }; Returns: boolean }
      jsonb_num: { Args: { v: Json }; Returns: number }
      log_app_event: {
        Args: {
          _action: string
          _entity_id?: string
          _entity_label?: string
          _entity_type?: string
          _metadata?: Json
        }
        Returns: undefined
      }
      log_component_sync: {
        Args: { _asset_id: string; _label: string; _metadata: Json }
        Returns: undefined
      }
      match_requirement_ref: {
        Args: { _ref: string; _source_id: string }
        Returns: Json
      }
      metric_compliance: {
        Args: { _assessed: number; _fulfilled: number; _not_applicable: number }
        Returns: number
      }
      metric_coverage: {
        Args: { _assessed: number; _total: number }
        Returns: number
      }
      normalize_section_ref: { Args: { _ref: string }; Returns: string }
      preview_requirement_catalog_import: {
        Args: {
          _content: string
          _sha256: string
          _signature_key_id?: string
          _signature_verified?: boolean
        }
        Returns: Json
      }
      profile_na_justification: { Args: { _text: string }; Returns: string }
      record_compliance_export: {
        Args: {
          _export_id: string
          _file_name: string
          _filters: Json
          _row_counts: Json
        }
        Returns: Json
      }
      repeal_requirement: {
        Args: { _requirement_id: string }
        Returns: undefined
      }
      require_admin: { Args: never; Returns: undefined }
      requirement_addresses_asset: {
        Args: { _source_id: string; _target_type: string }
        Returns: boolean
      }
      requirement_content_hash: {
        Args: { _requirement_id: string }
        Returns: string
      }
      requirement_passes_level: {
        Args: {
          _level: number
          _min_classification_level: number
          _sl_capability: number
        }
        Returns: boolean
      }
      requirement_snapshot: { Args: { _scope: Json }; Returns: Json }
      requirement_sync_pending: {
        Args: { _object_id: string; _object_type: string }
        Returns: {
          additions: number
          deactivations: number
          reactivations: number
          removals: number
        }[]
      }
      requirement_work_count: {
        Args: { _requirement_id: string }
        Returns: number
      }
      save_project_as_profile: {
        Args: {
          _component_type_id: string
          _description: string
          _name: string
          _project_id: string
          _target_sl: number
        }
        Returns: string
      }
      simulate_facility_requirements: {
        Args: { _facility_id: string; _overrides: Json }
        Returns: string[]
      }
      source_level_rank: {
        Args: { _level: Database["public"]["Enums"]["source_level"] }
        Returns: number
      }
      stockholm_today: { Args: never; Returns: string }
      submit_requirement_reviews: {
        Args: { _batch_id?: string; _items: Json }
        Returns: number
      }
      suggest_requirement_link: {
        Args: {
          _child_requirement_id: string
          _coverage?: string
          _parent_requirement_id: string
          _rationale?: string
        }
        Returns: string
      }
      sync_component_requirements: {
        Args: { _asset_id: string; _mode?: string }
        Returns: {
          action: string
          record_id: string
          requirement_id: string
        }[]
      }
      sync_components_of_types: {
        Args: { _type_ids: string[] }
        Returns: undefined
      }
      sync_requirements: {
        Args: { _mode?: string; _object_id: string; _object_type: string }
        Returns: {
          action: string
          chapter_section: string
          description: string
          inherited_from_facility_id: string
          min_classification_level: number
          record_id: string
          requirement_id: string
        }[]
      }
      target_sl_for_class: { Args: { _level: number }; Returns: number }
      trigger_has_linked_conditions: {
        Args: { _logic: Json }
        Returns: boolean
      }
      trigger_logic_keys: { Args: { _target: string }; Returns: string[] }
      trigger_logic_problems: {
        Args: { _logic: Json; _target_type: string }
        Returns: string[]
      }
      trigger_matches_facility: {
        Args: { _logic: Json; f: Json }
        Returns: boolean
      }
      trigger_matches_linked_facility: {
        Args: { _logic: Json; f: Json }
        Returns: boolean
      }
      trigger_matches_system: {
        Args: { _logic: Json; s: Json }
        Returns: boolean
      }
      verify_activity_chain: {
        Args: never
        Returns: {
          checked: number
          first_broken_seq: number
          head_hash: string
          head_seq: number
          intact: boolean
          problem: string
        }[]
      }
      withdraw_requirement_link: {
        Args: { _link_id: string; _reason: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      asset_criticality: "critical" | "important" | "supporting"
      classification_source: "inherited" | "own" | "overridden"
      compensating_measure_status: "proposed" | "accepted" | "rejected"
      compensating_measure_type: "technical" | "physical" | "organizational"
      compliance_status:
        | "Ej påbörjad"
        | "Pågående"
        | "Uppfyllt"
        | "Ej tillämpligt"
        | "Delvis uppfyllt"
        | "Ej uppfyllt"
      construction_type: "Berg" | "Betong" | "Sänktunnel" | "Överdäckning"
      control_category:
        | "network_security"
        | "access_control"
        | "patch_management"
        | "logging"
        | "encryption"
      facility_type:
        | "Vägtunnel"
        | "Bro"
        | "IT-System"
        | "Ledningscentral"
        | "Järnvägstunnel"
        | "Trafikledningscentral"
        | "Datacenter"
        | "Spåranläggning"
        | "Signalanläggning"
        | "Elkraftsanläggning"
        | "Terminal"
        | "Trafikplats"
      measure_scale: "security_level" | "maturity_level" | "none"
      project_status:
        | "planning"
        | "tender_ready"
        | "evaluation"
        | "awarded"
        | "ongoing"
        | "closed"
      requirement_addressee: "asset" | "supplier" | "asset_owner"
      requirement_applicability:
        | "preliminary"
        | "not_applicable"
        | "supplier_assessment"
        | "applicable"
        | "compensated"
      requirement_category:
        | "Fysisk Säkerhet"
        | "Informationssäkerhet"
        | "Krisberedskap"
      requirement_level: "strategic" | "mandatory" | "recommended"
      responsible_org: "supplier" | "client" | "joint"
      review_status: "pending" | "approved" | "flagged"
      source_level: "lag" | "förordning" | "föreskrift" | "standard"
      system_category:
        | "tunnel_traffic_ot"
        | "it_infrastructure"
        | "physical_security"
        | "communication_crisis"
      system_criticality: "critical" | "important" | "supporting"
      system_relation_type: "styr" | "övervakar" | "betjänar" | "stödjer"
      test_phase: "FAT1" | "FAT2" | "FAT3" | "SAT" | "OSAT"
      test_result_status:
        | "not_tested"
        | "passed"
        | "passed_with_remarks"
        | "failed"
      test_type:
        | "document_review"
        | "functional_test"
        | "penetration_test"
        | "configuration_test"
        | "risk_analysis_review"
        | "other"
      testability: "yes" | "no" | "partial"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      asset_criticality: ["critical", "important", "supporting"],
      classification_source: ["inherited", "own", "overridden"],
      compensating_measure_status: ["proposed", "accepted", "rejected"],
      compensating_measure_type: ["technical", "physical", "organizational"],
      compliance_status: [
        "Ej påbörjad",
        "Pågående",
        "Uppfyllt",
        "Ej tillämpligt",
        "Delvis uppfyllt",
        "Ej uppfyllt",
      ],
      construction_type: ["Berg", "Betong", "Sänktunnel", "Överdäckning"],
      control_category: [
        "network_security",
        "access_control",
        "patch_management",
        "logging",
        "encryption",
      ],
      facility_type: [
        "Vägtunnel",
        "Bro",
        "IT-System",
        "Ledningscentral",
        "Järnvägstunnel",
        "Trafikledningscentral",
        "Datacenter",
        "Spåranläggning",
        "Signalanläggning",
        "Elkraftsanläggning",
        "Terminal",
        "Trafikplats",
      ],
      measure_scale: ["security_level", "maturity_level", "none"],
      project_status: [
        "planning",
        "tender_ready",
        "evaluation",
        "awarded",
        "ongoing",
        "closed",
      ],
      requirement_addressee: ["asset", "supplier", "asset_owner"],
      requirement_applicability: [
        "preliminary",
        "not_applicable",
        "supplier_assessment",
        "applicable",
        "compensated",
      ],
      requirement_category: [
        "Fysisk Säkerhet",
        "Informationssäkerhet",
        "Krisberedskap",
      ],
      requirement_level: ["strategic", "mandatory", "recommended"],
      responsible_org: ["supplier", "client", "joint"],
      review_status: ["pending", "approved", "flagged"],
      source_level: ["lag", "förordning", "föreskrift", "standard"],
      system_category: [
        "tunnel_traffic_ot",
        "it_infrastructure",
        "physical_security",
        "communication_crisis",
      ],
      system_criticality: ["critical", "important", "supporting"],
      system_relation_type: ["styr", "övervakar", "betjänar", "stödjer"],
      test_phase: ["FAT1", "FAT2", "FAT3", "SAT", "OSAT"],
      test_result_status: [
        "not_tested",
        "passed",
        "passed_with_remarks",
        "failed",
      ],
      test_type: [
        "document_review",
        "functional_test",
        "penetration_test",
        "configuration_test",
        "risk_analysis_review",
        "other",
      ],
      testability: ["yes", "no", "partial"],
    },
  },
} as const
