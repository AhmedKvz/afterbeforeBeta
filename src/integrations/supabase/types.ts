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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      active_users: {
        Row: {
          event_id: string | null
          id: string
          is_visible: boolean | null
          last_seen: string | null
          latitude: number | null
          longitude: number | null
          user_id: string
        }
        Insert: {
          event_id?: string | null
          id?: string
          is_visible?: boolean | null
          last_seen?: string | null
          latitude?: number | null
          longitude?: number | null
          user_id: string
        }
        Update: {
          event_id?: string | null
          id?: string
          is_visible?: boolean | null
          last_seen?: string | null
          latitude?: number | null
          longitude?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_users_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      club_favorites: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
          venue_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
          venue_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
          venue_name?: string
        }
        Relationships: []
      }
      daily_swipe_limits: {
        Row: {
          id: string
          swipe_count: number
          swipe_date: string
          user_id: string
        }
        Insert: {
          id?: string
          swipe_count?: number
          swipe_date?: string
          user_id: string
        }
        Update: {
          id?: string
          swipe_count?: number
          swipe_date?: string
          user_id?: string
        }
        Relationships: []
      }
      event_checkins: {
        Row: {
          checked_in_at: string | null
          event_id: string
          id: string
          latitude: number | null
          longitude: number | null
          user_id: string
        }
        Insert: {
          checked_in_at?: string | null
          event_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          user_id: string
        }
        Update: {
          checked_in_at?: string | null
          event_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_checkins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reviews: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          rating: number
          review_text: string | null
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          rating: number
          review_text?: string | null
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          rating?: number
          review_text?: string | null
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_signals: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          signal_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          signal_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          signal_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_signals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_wishlists: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_wishlists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          capacity: number | null
          created_at: string | null
          date: string
          description: string | null
          end_time: string | null
          geofence_radius: number | null
          host_id: string | null
          id: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          music_genres: string[] | null
          neighborhood: string | null
          price: number | null
          start_time: string
          title: string
          venue_name: string | null
          venue_type: string | null
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          created_at?: string | null
          date: string
          description?: string | null
          end_time?: string | null
          geofence_radius?: number | null
          host_id?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          music_genres?: string[] | null
          neighborhood?: string | null
          price?: number | null
          start_time: string
          title: string
          venue_name?: string | null
          venue_type?: string | null
        }
        Update: {
          address?: string | null
          capacity?: number | null
          created_at?: string | null
          date?: string
          description?: string | null
          end_time?: string | null
          geofence_radius?: number | null
          host_id?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          music_genres?: string[] | null
          neighborhood?: string | null
          price?: number | null
          start_time?: string
          title?: string
          venue_name?: string | null
          venue_type?: string | null
        }
        Relationships: []
      }
      location_presence: {
        Row: {
          created_at: string | null
          id: string
          is_visible: boolean | null
          last_seen: string | null
          latitude: number
          location_name: string | null
          longitude: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          last_seen?: string | null
          latitude: number
          location_name?: string | null
          longitude: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          last_seen?: string | null
          latitude?: number
          location_name?: string | null
          longitude?: number
          user_id?: string
        }
        Relationships: []
      }
      lucky_100_claims: {
        Row: {
          claimed_at: string | null
          entry_id: string
          event_choice: string
          guestlist_name: string
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          entry_id: string
          event_choice: string
          guestlist_name: string
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          entry_id?: string
          event_choice?: string
          guestlist_name?: string
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lucky_100_claims_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "lucky_100_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      lucky_100_entries: {
        Row: {
          created_at: string | null
          eligible: boolean | null
          entry_date: string | null
          id: string
          prize_event_id: string | null
          user_id: string
          week_number: number
          won: boolean | null
          year: number
        }
        Insert: {
          created_at?: string | null
          eligible?: boolean | null
          entry_date?: string | null
          id?: string
          prize_event_id?: string | null
          user_id: string
          week_number: number
          won?: boolean | null
          year: number
        }
        Update: {
          created_at?: string | null
          eligible?: boolean | null
          entry_date?: string | null
          id?: string
          prize_event_id?: string | null
          user_id?: string
          week_number?: number
          won?: boolean | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "lucky_100_entries_prize_event_id_fkey"
            columns: ["prize_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      lucky100_counter: {
        Row: {
          global_count: number | null
          id: string
          last_winner_count: number | null
          updated_at: string | null
        }
        Insert: {
          global_count?: number | null
          id?: string
          last_winner_count?: number | null
          updated_at?: string | null
        }
        Update: {
          global_count?: number | null
          id?: string
          last_winner_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lucky100_winners: {
        Row: {
          check_in_number: number
          claimed_at: string | null
          event_id: string | null
          guestlist_name: string | null
          id: string
          prize_claimed: boolean | null
          prize_event_choice: string | null
          user_id: string
          won_at: string | null
        }
        Insert: {
          check_in_number: number
          claimed_at?: string | null
          event_id?: string | null
          guestlist_name?: string | null
          id?: string
          prize_claimed?: boolean | null
          prize_event_choice?: string | null
          user_id: string
          won_at?: string | null
        }
        Update: {
          check_in_number?: number
          claimed_at?: string | null
          event_id?: string | null
          guestlist_name?: string | null
          id?: string
          prize_claimed?: boolean | null
          prize_event_choice?: string | null
          user_id?: string
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lucky100_winners_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          event_id: string | null
          id: string
          matched_at: string | null
          status: string | null
          user1_id: string
          user2_id: string
        }
        Insert: {
          event_id?: string | null
          id?: string
          matched_at?: string | null
          status?: string | null
          user1_id: string
          user2_id: string
        }
        Update: {
          event_id?: string | null
          id?: string
          matched_at?: string | null
          status?: string | null
          user1_id?: string
          user2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      premium_interest: {
        Row: {
          created_at: string | null
          feature: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feature: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          feature?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string | null
          age: number | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          display_name: string
          events_attended: number | null
          id: string
          level: number | null
          music_preferences: string[] | null
          neighborhood: string | null
          onboarding_completed: boolean | null
          total_matches: number | null
          updated_at: string | null
          user_id: string
          venue_address: string | null
          venue_capacity: number | null
          venue_contact_phone: string | null
          venue_description: string | null
          venue_instagram: string | null
          venue_logo_url: string | null
          venue_music_genres: string[] | null
          venue_name: string | null
          venue_type: string | null
          xp: number | null
        }
        Insert: {
          account_type?: string | null
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          display_name: string
          events_attended?: number | null
          id?: string
          level?: number | null
          music_preferences?: string[] | null
          neighborhood?: string | null
          onboarding_completed?: boolean | null
          total_matches?: number | null
          updated_at?: string | null
          user_id: string
          venue_address?: string | null
          venue_capacity?: number | null
          venue_contact_phone?: string | null
          venue_description?: string | null
          venue_instagram?: string | null
          venue_logo_url?: string | null
          venue_music_genres?: string[] | null
          venue_name?: string | null
          venue_type?: string | null
          xp?: number | null
        }
        Update: {
          account_type?: string | null
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          display_name?: string
          events_attended?: number | null
          id?: string
          level?: number | null
          music_preferences?: string[] | null
          neighborhood?: string | null
          onboarding_completed?: boolean | null
          total_matches?: number | null
          updated_at?: string | null
          user_id?: string
          venue_address?: string | null
          venue_capacity?: number | null
          venue_contact_phone?: string | null
          venue_description?: string | null
          venue_instagram?: string | null
          venue_logo_url?: string | null
          venue_music_genres?: string[] | null
          venue_name?: string | null
          venue_type?: string | null
          xp?: number | null
        }
        Relationships: []
      }
      quests: {
        Row: {
          created_at: string | null
          description: string
          icon: string | null
          id: string
          is_active: boolean | null
          quest_type: string
          target_count: number
          title: string
          xp_reward: number
        }
        Insert: {
          created_at?: string | null
          description: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          quest_type: string
          target_count?: number
          title: string
          xp_reward?: number
        }
        Update: {
          created_at?: string | null
          description?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          quest_type?: string
          target_count?: number
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      remote_unlocks: {
        Row: {
          amount_rsd: number
          expires_at: string | null
          id: string
          unlocked_at: string | null
          user_id: string
          venue_name: string
        }
        Insert: {
          amount_rsd?: number
          expires_at?: string | null
          id?: string
          unlocked_at?: string | null
          user_id: string
          venue_name: string
        }
        Update: {
          amount_rsd?: number
          expires_at?: string | null
          id?: string
          unlocked_at?: string | null
          user_id?: string
          venue_name?: string
        }
        Relationships: []
      }
      swipe_actions: {
        Row: {
          action: string
          context: string
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          action: string
          context: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          action?: string
          context?: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      swipes: {
        Row: {
          action: string
          created_at: string | null
          event_id: string | null
          id: string
          swiped_id: string
          swiper_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          event_id?: string | null
          id?: string
          swiped_id: string
          swiper_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          event_id?: string | null
          id?: string
          swiped_id?: string
          swiper_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swipes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_quests: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          progress: number | null
          quest_id: string
          user_id: string
          week_start: string
          xp_claimed: boolean | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          progress?: number | null
          quest_id: string
          user_id: string
          week_start: string
          xp_claimed?: boolean | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          progress?: number | null
          quest_id?: string
          user_id?: string
          week_start?: string
          xp_claimed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_quests_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
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
      vibe_signals: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          signal_type: string
          user_id: string
          venue_name: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          signal_type: string
          user_id: string
          venue_name?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          signal_type?: string
          user_id?: string
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vibe_signals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      waves: {
        Row: {
          created_at: string | null
          id: string
          match_id: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_id: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          match_id?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waves_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_leaderboard: {
        Row: {
          id: string
          rank: number | null
          total_xp: number | null
          updated_at: string | null
          user_id: string
          week_number: number
          year: number
        }
        Insert: {
          id?: string
          rank?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id: string
          week_number: number
          year: number
        }
        Update: {
          id?: string
          rank?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string
          week_number?: number
          year?: number
        }
        Relationships: []
      }
      weekly_winners: {
        Row: {
          claimed_at: string | null
          guestlist_name: string | null
          id: string
          prize_claimed: boolean | null
          prize_event_choice: string | null
          rank: number
          total_xp: number
          user_id: string
          week_start: string
          won_at: string | null
        }
        Insert: {
          claimed_at?: string | null
          guestlist_name?: string | null
          id?: string
          prize_claimed?: boolean | null
          prize_event_choice?: string | null
          rank: number
          total_xp: number
          user_id: string
          week_start: string
          won_at?: string | null
        }
        Update: {
          claimed_at?: string | null
          guestlist_name?: string | null
          id?: string
          prize_claimed?: boolean | null
          prize_event_choice?: string | null
          rank?: number
          total_xp?: number
          user_id?: string
          week_start?: string
          won_at?: string | null
        }
        Relationships: []
      }
      xp_transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      announce_weekly_winners: {
        Args: never
        Returns: {
          winner_id: string
          winner_name: string
          winner_rank: number
          winner_xp: number
        }[]
      }
      draw_lucky_100_winners: {
        Args: { num_winners?: number }
        Returns: {
          winner_id: string
          winner_name: string
        }[]
      }
      get_event_stats: {
        Args: { event_uuid: string }
        Returns: {
          avg_rating: number
          latest_review: string
          review_count: number
        }[]
      }
      get_lucky100_stats: {
        Args: never
        Returns: {
          check_ins_to_next: number
          global_count: number
          last_winner_count: number
          next_lucky_number: number
        }[]
      }
      get_venue_heat: {
        Args: { days_back?: number }
        Returns: {
          checkin_count: number
          signal_count: number
          top_event_id: string
          top_event_title: string
          total_heat: number
          venue_name: string
        }[]
      }
      get_weekly_leaderboard: {
        Args: { limit_count?: number; week_num: number; year_num: number }
        Returns: {
          avatar_url: string
          display_name: string
          rank: number
          total_xp: number
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
    },
  },
} as const
