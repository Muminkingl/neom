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
      patients: {
        Row: {
          id: string
          name: string
          dob: string
          hospital_file_number: string
          mobile_number: string
          sex: string
          age_of_diagnosis: string
          diagnosis: string
          treatment: string
          current_treatment: string
          history: string
          past_medical_history: string
          drug_history: string
          past_surgical_history: string
          examination: string
          note: string | null
          follow_up_date: string
          table_data: string
          amount_paid?: number | null
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          name: string
          dob: string
          hospital_file_number: string
          mobile_number: string
          sex: string
          age_of_diagnosis: string
          diagnosis: string
          treatment: string
          current_treatment: string
          history: string
          past_medical_history: string
          drug_history: string
          past_surgical_history: string
          examination: string
          note?: string | null
          follow_up_date: string
          table_data: string
          amount_paid?: number | null
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          name?: string
          dob?: string
          hospital_file_number?: string
          mobile_number?: string
          sex?: string
          age_of_diagnosis?: string
          diagnosis?: string
          treatment?: string
          current_treatment?: string
          history?: string
          past_medical_history?: string
          drug_history?: string
          past_surgical_history?: string
          examination?: string
          note?: string | null
          follow_up_date?: string
          table_data?: string
          amount_paid?: number | null
          created_at?: string
          updated_at?: string
          user_id?: string
        }
      }
      visits: {
        Row: {
          id: string
          patient_id: string
          diagnosis: string
          treatment: string
          current_treatment: string
          history: string
          past_medical_history: string
          drug_history: string
          past_surgical_history: string
          examination: string
          note: string | null
          follow_up_date: string
          table_data: string
          amount_paid?: number | null
          visited_at: string
          created_at?: string
          user_id: string
        }
        Insert: {
          id?: string
          patient_id: string
          diagnosis?: string
          treatment?: string
          current_treatment?: string
          history?: string
          past_medical_history?: string
          drug_history?: string
          past_surgical_history?: string
          examination?: string
          note?: string | null
          follow_up_date?: string
          table_data?: string
          amount_paid?: number | null
          visited_at?: string
          created_at?: string
          user_id?: string
        }
        Update: {
          id?: string
          patient_id?: string
          diagnosis?: string
          treatment?: string
          current_treatment?: string
          history?: string
          past_medical_history?: string
          drug_history?: string
          past_surgical_history?: string
          examination?: string
          note?: string | null
          follow_up_date?: string
          table_data?: string
          amount_paid?: number | null
          visited_at?: string
          created_at?: string
          user_id?: string
        }
      }
      store_purchases: {
        Row: {
          id: string
          item_name: string
          category: string
          quantity: number
          unit: string
          unit_price: number
          total_price: number
          purchase_date: string
          supplier: string
          invoice_number: string
          payment_status: string
          payment_method: string
          expiry_date?: string | null
          notes?: string | null
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          item_name: string
          category?: string
          quantity?: number
          unit?: string
          unit_price?: number
          total_price?: number
          purchase_date?: string
          supplier?: string
          invoice_number?: string
          payment_status?: string
          payment_method?: string
          expiry_date?: string | null
          notes?: string | null
          created_at?: string
          user_id?: string
        }
        Update: {
          id?: string
          item_name?: string
          category?: string
          quantity?: number
          unit?: string
          unit_price?: number
          total_price?: number
          purchase_date?: string
          supplier?: string
          invoice_number?: string
          payment_status?: string
          payment_method?: string
          expiry_date?: string | null
          notes?: string | null
          created_at?: string
          user_id?: string
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
      [_ in never]: never
    }
  }
}