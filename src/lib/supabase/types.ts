export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      reports: {
        Row: {
          id: string
          created_at: string
          type: 'pending_shipments' | 'inventory'
          filename: string
          row_count: number
          raw_data: Json
        }
        Insert: {
          id?: string
          created_at?: string
          type: 'pending_shipments' | 'inventory'
          filename: string
          row_count: number
          raw_data: Json
        }
        Update: {
          id?: string
          created_at?: string
          type?: 'pending_shipments' | 'inventory'
          filename?: string
          row_count?: number
          raw_data?: Json
        }
      }
      analysis_results: {
        Row: {
          id: string
          created_at: string
          pending_report_id: string
          inventory_report_id: string | null
          filters_applied: Json
          results_json: Json
          orders_analyzed: number
          orders_unlockable: number
        }
        Insert: {
          id?: string
          created_at?: string
          pending_report_id: string
          inventory_report_id?: string | null
          filters_applied: Json
          results_json: Json
          orders_analyzed: number
          orders_unlockable: number
        }
        Update: {
          id?: string
          created_at?: string
          pending_report_id?: string
          inventory_report_id?: string | null
          filters_applied?: Json
          results_json?: Json
          orders_analyzed?: number
          orders_unlockable?: number
        }
      }
      sku_trends: {
        Row: {
          id: string
          sku: string
          date: string
          orders_impacted: number
          analysis_id: string
        }
        Insert: {
          id?: string
          sku: string
          date?: string
          orders_impacted: number
          analysis_id: string
        }
        Update: {
          id?: string
          sku?: string
          date?: string
          orders_impacted?: number
          analysis_id?: string
        }
      }
    }
  }
}

export type Report = Database['public']['Tables']['reports']['Row']
export type AnalysisResult = Database['public']['Tables']['analysis_results']['Row']
export type SkuTrend = Database['public']['Tables']['sku_trends']['Row']
