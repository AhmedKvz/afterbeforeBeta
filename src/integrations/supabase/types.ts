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
      afc_ledger: {
        Row: {
          balance_after: number
          created_at: string
          delta: number
          id: string
          reason: string
          ref_id: string | null
          ref_type: string | null
          user_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          delta: number
          id?: string
          reason: string
          ref_id?: string | null
          ref_type?: string | null
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          delta?: number
          id?: string
          reason?: string
          ref_id?: string | null
          ref_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_crowd_predictions: {
        Row: {
          actual_attendance: number | null
          computed_at: string | null
          confidence: number | null
          event_id: string
          factors: Json | null
          id: string
          predicted_attendance: number | null
          predicted_peak_hour: string | null
          predicted_vibe: string | null
        }
        Insert: {
          actual_attendance?: number | null
          computed_at?: string | null
          confidence?: number | null
          event_id: string
          factors?: Json | null
          id?: string
          predicted_attendance?: number | null
          predicted_peak_hour?: string | null
          predicted_vibe?: string | null
        }
        Update: {
          actual_attendance?: number | null
          computed_at?: string | null
          confidence?: number | null
          event_id?: string
          factors?: Json | null
          id?: string
          predicted_attendance?: number | null
          predicted_peak_hour?: string | null
          predicted_vibe?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_crowd_predictions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_match_scores: {
        Row: {
          behavior_score: number | null
          computed_at: string | null
          event_id: string | null
          id: string
          match_score: number | null
          music_score: number | null
          proximity_score: number | null
          social_score: number | null
          target_user_id: string
          user_id: string
        }
        Insert: {
          behavior_score?: number | null
          computed_at?: string | null
          event_id?: string | null
          id?: string
          match_score?: number | null
          music_score?: number | null
          proximity_score?: number | null
          social_score?: number | null
          target_user_id: string
          user_id: string
        }
        Update: {
          behavior_score?: number | null
          computed_at?: string | null
          event_id?: string | null
          id?: string
          match_score?: number | null
          music_score?: number | null
          proximity_score?: number | null
          social_score?: number | null
          target_user_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_match_scores_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_scene_health: {
        Row: {
          computed_at: string | null
          crowd_density: string | null
          date: string
          health_score: number | null
          id: string
          negative_signals: number | null
          positive_signals: number | null
          review_sentiment: number | null
          trust_level: string | null
          venue_name: string
        }
        Insert: {
          computed_at?: string | null
          crowd_density?: string | null
          date: string
          health_score?: number | null
          id?: string
          negative_signals?: number | null
          positive_signals?: number | null
          review_sentiment?: number | null
          trust_level?: string | null
          venue_name: string
        }
        Update: {
          computed_at?: string | null
          crowd_density?: string | null
          date?: string
          health_score?: number | null
          id?: string
          negative_signals?: number | null
          positive_signals?: number | null
          review_sentiment?: number | null
          trust_level?: string | null
          venue_name?: string
        }
        Relationships: []
      }
      ai_training_events: {
        Row: {
          created_at: string | null
          event_type: string
          features: Json
          id: string
          label: string | null
          target_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          features: Json
          id?: string
          label?: string | null
          target_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          features?: Json
          id?: string
          label?: string | null
          target_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event: string
          id: number
          props: Json
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: number
          props?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: number
          props?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      best_party_votes: {
        Row: {
          created_at: string
          event_id: string
          id: string
          month: number
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          month: number
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          month?: number
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "best_party_votes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      business_replies: {
        Row: {
          created_at: string
          id: string
          replier_id: string
          reply_text: string
          review_id: string
          updated_at: string
          venue_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          replier_id: string
          reply_text: string
          review_id: string
          updated_at?: string
          venue_name: string
        }
        Update: {
          created_at?: string
          id?: string
          replier_id?: string
          reply_text?: string
          review_id?: string
          updated_at?: string
          venue_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "event_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_submissions: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          media_type: string
          media_url: string
          sponsored_id: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          media_type?: string
          media_url: string
          sponsored_id: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          media_type?: string
          media_url?: string
          sponsored_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_submissions_sponsored_id_fkey"
            columns: ["sponsored_id"]
            isOneToOne: false
            referencedRelation: "sponsored_quests"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_votes: {
        Row: {
          created_at: string
          id: string
          submission_id: string
          voter: string
        }
        Insert: {
          created_at?: string
          id?: string
          submission_id: string
          voter: string
        }
        Update: {
          created_at?: string
          id?: string
          submission_id?: string
          voter?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_votes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "campaign_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_feedback: {
        Row: {
          created_at: string
          id: string
          label: string
          question: string
          score: number
          user_id: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          question: string
          score: number
          user_id: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          question?: string
          score?: number
          user_id?: string
          venue_id?: string | null
        }
        Relationships: []
      }
      close_friends: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
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
      conversations: {
        Row: {
          created_at: string
          id: string
          initiated_by: string
          last_message: string | null
          last_message_at: string | null
          status: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          initiated_by: string
          last_message?: string | null
          last_message_at?: string | null
          status?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          initiated_by?: string
          last_message?: string | null
          last_message_at?: string | null
          status?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      crew_members: {
        Row: {
          crew_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          crew_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          crew_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_members_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_messages: {
        Row: {
          body: string
          created_at: string
          crew_id: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          crew_id: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          crew_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_messages_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
        ]
      }
      crews: {
        Row: {
          cap: number
          created_at: string
          created_by: string
          event_id: string | null
          id: string
          night: string
          venue_id: string | null
        }
        Insert: {
          cap?: number
          created_at?: string
          created_by: string
          event_id?: string | null
          id?: string
          night: string
          venue_id?: string | null
        }
        Update: {
          cap?: number
          created_at?: string
          created_by?: string
          event_id?: string | null
          id?: string
          night?: string
          venue_id?: string | null
        }
        Relationships: []
      }
      custom_quest_members: {
        Row: {
          id: string
          joined_at: string
          progress: number
          quest_id: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          progress?: number
          quest_id: string
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          progress?: number
          quest_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_quest_members_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "custom_quests"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_quests: {
        Row: {
          category: string
          created_at: string
          creator_id: string
          deadline: string | null
          description: string | null
          icon: string | null
          id: string
          is_crew: boolean
          is_seed: boolean
          kind: string
          moderation_status: string
          status: string
          target_count: number
          tier_required: number
          timeframe: string
          title: string
          upvotes: number
          visibility: string
          xp_reward: number
        }
        Insert: {
          category?: string
          created_at?: string
          creator_id: string
          deadline?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_crew?: boolean
          is_seed?: boolean
          kind?: string
          moderation_status?: string
          status?: string
          target_count?: number
          tier_required?: number
          timeframe?: string
          title: string
          upvotes?: number
          visibility?: string
          xp_reward?: number
        }
        Update: {
          category?: string
          created_at?: string
          creator_id?: string
          deadline?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_crew?: boolean
          is_seed?: boolean
          kind?: string
          moderation_status?: string
          status?: string
          target_count?: number
          tier_required?: number
          timeframe?: string
          title?: string
          upvotes?: number
          visibility?: string
          xp_reward?: number
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
      dance_sessions: {
        Row: {
          created_at: string
          duration_s: number
          id: string
          moves: number
          night: string
          score: number
          user_id: string
          venue_id: string | null
          venue_name: string | null
        }
        Insert: {
          created_at?: string
          duration_s?: number
          id?: string
          moves?: number
          night: string
          score?: number
          user_id: string
          venue_id?: string | null
          venue_name?: string | null
        }
        Update: {
          created_at?: string
          duration_s?: number
          id?: string
          moves?: number
          night?: string
          score?: number
          user_id?: string
          venue_id?: string | null
          venue_name?: string | null
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
          helpful_count: number
          id: string
          moderation_flags: string[] | null
          moderation_score: number | null
          moderation_status: string | null
          rating: number
          report_count: number
          review_text: string | null
          user_id: string
          venue_name: string | null
          venue_type: string | null
          verified_visit: boolean | null
          vibe_tags: string[] | null
          visit_date: string | null
          weight: number
          xp_earned: number | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          helpful_count?: number
          id?: string
          moderation_flags?: string[] | null
          moderation_score?: number | null
          moderation_status?: string | null
          rating: number
          report_count?: number
          review_text?: string | null
          user_id: string
          venue_name?: string | null
          venue_type?: string | null
          verified_visit?: boolean | null
          vibe_tags?: string[] | null
          visit_date?: string | null
          weight?: number
          xp_earned?: number | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          helpful_count?: number
          id?: string
          moderation_flags?: string[] | null
          moderation_score?: number | null
          moderation_status?: string | null
          rating?: number
          report_count?: number
          review_text?: string | null
          user_id?: string
          venue_name?: string | null
          venue_type?: string | null
          verified_visit?: boolean | null
          vibe_tags?: string[] | null
          visit_date?: string | null
          weight?: number
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
          access_price_rsd: number | null
          address: string | null
          capacity: number | null
          created_at: string | null
          date: string
          description: string | null
          end_time: string | null
          event_type: string | null
          geofence_radius: number | null
          host_id: string | null
          id: string
          image_url: string | null
          is_secret: boolean | null
          latitude: number | null
          lineup: string[] | null
          longitude: number | null
          max_guests: number | null
          music_genres: string[] | null
          neighborhood: string | null
          price: number | null
          requires_verified_profile: boolean | null
          secret_location_reveal_at: string | null
          set_times: Json
          set_times_by: string | null
          start_time: string
          title: string
          venue_name: string | null
          venue_type: string | null
        }
        Insert: {
          access_price_rsd?: number | null
          address?: string | null
          capacity?: number | null
          created_at?: string | null
          date: string
          description?: string | null
          end_time?: string | null
          event_type?: string | null
          geofence_radius?: number | null
          host_id?: string | null
          id?: string
          image_url?: string | null
          is_secret?: boolean | null
          latitude?: number | null
          lineup?: string[] | null
          longitude?: number | null
          max_guests?: number | null
          music_genres?: string[] | null
          neighborhood?: string | null
          price?: number | null
          requires_verified_profile?: boolean | null
          secret_location_reveal_at?: string | null
          set_times?: Json
          set_times_by?: string | null
          start_time: string
          title: string
          venue_name?: string | null
          venue_type?: string | null
        }
        Update: {
          access_price_rsd?: number | null
          address?: string | null
          capacity?: number | null
          created_at?: string | null
          date?: string
          description?: string | null
          end_time?: string | null
          event_type?: string | null
          geofence_radius?: number | null
          host_id?: string | null
          id?: string
          image_url?: string | null
          is_secret?: boolean | null
          latitude?: number | null
          lineup?: string[] | null
          longitude?: number | null
          max_guests?: number | null
          music_genres?: string[] | null
          neighborhood?: string | null
          price?: number | null
          requires_verified_profile?: boolean | null
          secret_location_reveal_at?: string | null
          set_times?: Json
          set_times_by?: string | null
          start_time?: string
          title?: string
          venue_name?: string | null
          venue_type?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          context: string | null
          created_at: string
          id: string
          message: string
          rating: number | null
          user_id: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: string
          message: string
          rating?: number | null
          user_id?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: string
          message?: string
          rating?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      instagram_connections: {
        Row: {
          access_token: string | null
          connected_at: string | null
          followers_count: number | null
          id: string
          instagram_handle: string
          instagram_id: string | null
          is_verified: boolean | null
          last_synced_at: string | null
          profile_picture_url: string | null
          token_expires_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          connected_at?: string | null
          followers_count?: number | null
          id?: string
          instagram_handle: string
          instagram_id?: string | null
          is_verified?: boolean | null
          last_synced_at?: string | null
          profile_picture_url?: string | null
          token_expires_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          connected_at?: string | null
          followers_count?: number | null
          id?: string
          instagram_handle?: string
          instagram_id?: string | null
          is_verified?: boolean | null
          last_synced_at?: string | null
          profile_picture_url?: string | null
          token_expires_at?: string | null
          user_id?: string
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
      memento_requests: {
        Row: {
          created_at: string
          id: string
          memento_id: string
          owner_id: string
          requester_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          memento_id: string
          owner_id: string
          requester_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          memento_id?: string
          owner_id?: string
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "memento_requests_memento_id_fkey"
            columns: ["memento_id"]
            isOneToOne: false
            referencedRelation: "mementos"
            referencedColumns: ["id"]
          },
        ]
      }
      mementos: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          media_url: string | null
          note: string | null
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          media_url?: string | null
          note?: string | null
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          media_url?: string | null
          note?: string | null
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "mementos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
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
          crew_intent: string | null
          display_name: string
          events_attended: number | null
          fav_venues: string[] | null
          founding_raver_number: number | null
          id: string
          instagram_avatar_url: string | null
          instagram_followers: number | null
          instagram_handle: string | null
          instagram_verified: boolean | null
          is_founding_raver: boolean
          is_verified: boolean | null
          level: number | null
          music_preferences: string[] | null
          neighborhood: string | null
          onboarding_completed: boolean | null
          referral_code: string | null
          referred_by: string | null
          sparks_enabled: boolean
          spendable_xp: number
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
          verification_date: string | null
          xp: number | null
        }
        Insert: {
          account_type?: string | null
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          crew_intent?: string | null
          display_name: string
          events_attended?: number | null
          fav_venues?: string[] | null
          founding_raver_number?: number | null
          id?: string
          instagram_avatar_url?: string | null
          instagram_followers?: number | null
          instagram_handle?: string | null
          instagram_verified?: boolean | null
          is_founding_raver?: boolean
          is_verified?: boolean | null
          level?: number | null
          music_preferences?: string[] | null
          neighborhood?: string | null
          onboarding_completed?: boolean | null
          referral_code?: string | null
          referred_by?: string | null
          sparks_enabled?: boolean
          spendable_xp?: number
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
          verification_date?: string | null
          xp?: number | null
        }
        Update: {
          account_type?: string | null
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          crew_intent?: string | null
          display_name?: string
          events_attended?: number | null
          fav_venues?: string[] | null
          founding_raver_number?: number | null
          id?: string
          instagram_avatar_url?: string | null
          instagram_followers?: number | null
          instagram_handle?: string | null
          instagram_verified?: boolean | null
          is_founding_raver?: boolean
          is_verified?: boolean | null
          level?: number | null
          music_preferences?: string[] | null
          neighborhood?: string | null
          onboarding_completed?: boolean | null
          referral_code?: string | null
          referred_by?: string | null
          sparks_enabled?: boolean
          spendable_xp?: number
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
          verification_date?: string | null
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
      referrals: {
        Row: {
          code: string
          converted_at: string | null
          created_at: string
          id: string
          referee_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          code: string
          converted_at?: string | null
          created_at?: string
          id?: string
          referee_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          code?: string
          converted_at?: string | null
          created_at?: string
          id?: string
          referee_id?: string
          referrer_id?: string
          status?: string
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
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
          target_user_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string
          target_user_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_user_id?: string
        }
        Relationships: []
      }
      review_photos: {
        Row: {
          created_at: string
          id: string
          photo_url: string
          position: number
          review_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_url: string
          position?: number
          review_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_url?: string
          position?: number
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_photos_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "event_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          review_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          review_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          review_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "event_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_votes: {
        Row: {
          created_at: string
          id: string
          review_id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          review_id: string
          user_id: string
          vote_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          review_id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "event_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_redemptions: {
        Row: {
          code: string | null
          cost_xp: number
          created_at: string
          expires_at: string | null
          id: string
          night: string | null
          redeemed_at: string | null
          reward_id: string
          status: string
          unlocked_at: string | null
          user_id: string
          venue_id: string | null
          verified_by: string | null
        }
        Insert: {
          code?: string | null
          cost_xp: number
          created_at?: string
          expires_at?: string | null
          id?: string
          night?: string | null
          redeemed_at?: string | null
          reward_id: string
          status?: string
          unlocked_at?: string | null
          user_id: string
          venue_id?: string | null
          verified_by?: string | null
        }
        Update: {
          code?: string | null
          cost_xp?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          night?: string | null
          redeemed_at?: string | null
          reward_id?: string
          status?: string
          unlocked_at?: string | null
          user_id?: string
          venue_id?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          claimed_count: number
          code: string | null
          cost_xp: number
          hue: number
          icon: string | null
          id: string
          is_active: boolean
          is_locked: boolean
          night: string | null
          reward_type: string
          sort: number
          stock: number | null
          stock_label: string | null
          sub: string | null
          tag: string | null
          title: string
          unlock_method: string
          venue_id: string | null
        }
        Insert: {
          claimed_count?: number
          code?: string | null
          cost_xp: number
          hue?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_locked?: boolean
          night?: string | null
          reward_type?: string
          sort?: number
          stock?: number | null
          stock_label?: string | null
          sub?: string | null
          tag?: string | null
          title: string
          unlock_method?: string
          venue_id?: string | null
        }
        Update: {
          claimed_count?: number
          code?: string | null
          cost_xp?: number
          hue?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_locked?: boolean
          night?: string | null
          reward_type?: string
          sort?: number
          stock?: number | null
          stock_label?: string | null
          sub?: string | null
          tag?: string | null
          title?: string
          unlock_method?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rewards_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      secret_party_invites: {
        Row: {
          created_at: string | null
          event_id: string
          expires_at: string | null
          id: string
          invite_code: string
          status: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          expires_at?: string | null
          id?: string
          invite_code: string
          status?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          expires_at?: string | null
          id?: string
          invite_code?: string
          status?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secret_party_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      secret_party_requests: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          paid_at: string | null
          payment_amount_rsd: number | null
          rejection_reason: string | null
          request_message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          paid_at?: string | null
          payment_amount_rsd?: number | null
          rejection_reason?: string | null
          request_message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          paid_at?: string | null
          payment_amount_rsd?: number | null
          rejection_reason?: string | null
          request_message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secret_party_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      sparks: {
        Row: {
          conversation_id: string | null
          created_at: string
          expires_at: string
          from_user: string
          id: string
          status: string
          to_user: string
          venue_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          expires_at?: string
          from_user: string
          id?: string
          status?: string
          to_user: string
          venue_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          expires_at?: string
          from_user?: string
          id?: string
          status?: string
          to_user?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sparks_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsored_quest_progress: {
        Row: {
          accepted_at: string
          completed: boolean
          id: string
          progress: number
          sponsored_quest_id: string
          user_id: string
        }
        Insert: {
          accepted_at?: string
          completed?: boolean
          id?: string
          progress?: number
          sponsored_quest_id: string
          user_id: string
        }
        Update: {
          accepted_at?: string
          completed?: boolean
          id?: string
          progress?: number
          sponsored_quest_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsored_quest_progress_sponsored_quest_id_fkey"
            columns: ["sponsored_quest_id"]
            isOneToOne: false
            referencedRelation: "sponsored_quests"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsored_quests: {
        Row: {
          code: string | null
          description: string | null
          hue: number
          id: string
          is_active: boolean
          kind: string
          logo: string | null
          media: string
          reward_label: string | null
          rule: string
          sort: number
          spots_label: string | null
          target_count: number
          title: string
          venue_name: string | null
          xp_reward: number
        }
        Insert: {
          code?: string | null
          description?: string | null
          hue?: number
          id?: string
          is_active?: boolean
          kind?: string
          logo?: string | null
          media?: string
          reward_label?: string | null
          rule?: string
          sort?: number
          spots_label?: string | null
          target_count?: number
          title: string
          venue_name?: string | null
          xp_reward?: number
        }
        Update: {
          code?: string | null
          description?: string | null
          hue?: number
          id?: string
          is_active?: boolean
          kind?: string
          logo?: string | null
          media?: string
          reward_label?: string | null
          rule?: string
          sort?: number
          spots_label?: string | null
          target_count?: number
          title?: string
          venue_name?: string | null
          xp_reward?: number
        }
        Relationships: []
      }
      stories: {
        Row: {
          caption: string | null
          created_at: string
          expires_at: string
          flag_count: number
          id: string
          is_hidden: boolean
          media_url: string
          user_id: string
          venue_name: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          flag_count?: number
          id?: string
          is_hidden?: boolean
          media_url: string
          user_id: string
          venue_name?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          flag_count?: number
          id?: string
          is_hidden?: boolean
          media_url?: string
          user_id?: string
          venue_name?: string | null
        }
        Relationships: []
      }
      story_flags: {
        Row: {
          created_at: string
          id: string
          reason: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_flags_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      streak_claims: {
        Row: {
          claim_date: string
          id: string
          user_id: string
          xp: number
        }
        Insert: {
          claim_date: string
          id?: string
          user_id: string
          xp: number
        }
        Update: {
          claim_date?: string
          id?: string
          user_id?: string
          xp?: number
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
          predicted_score: number | null
          swiped_id: string
          swiper_id: string
          was_correct: boolean | null
        }
        Insert: {
          action: string
          created_at?: string | null
          event_id?: string | null
          id?: string
          predicted_score?: number | null
          swiped_id: string
          swiper_id: string
          was_correct?: boolean | null
        }
        Update: {
          action?: string
          created_at?: string | null
          event_id?: string | null
          id?: string
          predicted_score?: number | null
          swiped_id?: string
          swiper_id?: string
          was_correct?: boolean | null
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
      user_streaks: {
        Row: {
          current_streak: number
          last_claim_date: string | null
          longest_streak: number
          shield_month: string | null
          shield_saved_at: string | null
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_claim_date?: string | null
          longest_streak?: number
          shield_month?: string | null
          shield_saved_at?: string | null
          user_id: string
        }
        Update: {
          current_streak?: number
          last_claim_date?: string | null
          longest_streak?: number
          shield_month?: string | null
          shield_saved_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      venue_checkins: {
        Row: {
          awarded_afc: number
          awarded_xp: number
          created_at: string
          crew_size: number
          distance_m: number
          early_bird: boolean
          flags: string[]
          id: string
          lat: number
          lon: number
          user_id: string
          venue_id: string
        }
        Insert: {
          awarded_afc?: number
          awarded_xp?: number
          created_at?: string
          crew_size?: number
          distance_m: number
          early_bird?: boolean
          flags?: string[]
          id?: string
          lat: number
          lon: number
          user_id: string
          venue_id: string
        }
        Update: {
          awarded_afc?: number
          awarded_xp?: number
          created_at?: string
          crew_size?: number
          distance_m?: number
          early_bird?: boolean
          flags?: string[]
          id?: string
          lat?: number
          lon?: number
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_checkins_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_intent: {
        Row: {
          created_at: string
          fulfilled: boolean
          id: string
          night: string
          user_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          fulfilled?: boolean
          id?: string
          night?: string
          user_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          fulfilled?: boolean
          id?: string
          night?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_intent_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_presence: {
        Row: {
          id: string
          last_seen: string
          user_id: string
          venue_name: string
          visible: boolean
        }
        Insert: {
          id?: string
          last_seen?: string
          user_id: string
          venue_name: string
          visible?: boolean
        }
        Update: {
          id?: string
          last_seen?: string
          user_id?: string
          venue_name?: string
          visible?: boolean
        }
        Relationships: []
      }
      venue_review_summary: {
        Row: {
          computed_at: string
          summary: Json
          venue_name: string
        }
        Insert: {
          computed_at?: string
          summary: Json
          venue_name: string
        }
        Update: {
          computed_at?: string
          summary?: Json
          venue_name?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          claim_status: string
          claimed_by: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          emoji: string | null
          hue: number
          id: string
          instagram: string | null
          is_partner: boolean
          latitude: number | null
          longitude: number | null
          name: string
          neighborhood: string | null
          slug: string | null
          sort: number
          type: string
          verified: boolean
        }
        Insert: {
          claim_status?: string
          claimed_by?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          hue?: number
          id?: string
          instagram?: string | null
          is_partner?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          neighborhood?: string | null
          slug?: string | null
          sort?: number
          type?: string
          verified?: boolean
        }
        Update: {
          claim_status?: string
          claimed_by?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          hue?: number
          id?: string
          instagram?: string | null
          is_partner?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          neighborhood?: string | null
          slug?: string | null
          sort?: number
          type?: string
          verified?: boolean
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
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          platform: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          platform?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          platform?: string | null
          source?: string | null
        }
        Relationships: []
      }
      war_members: {
        Row: {
          added_at: string
          email: string
          role: string
          user_id: string
        }
        Insert: {
          added_at?: string
          email: string
          role?: string
          user_id: string
        }
        Update: {
          added_at?: string
          email?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      war_tasks: {
        Row: {
          created_at: string
          id: string
          note: string | null
          owner: string | null
          section: string
          sort: number
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          owner?: string | null
          section: string
          sort?: number
          source?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          owner?: string | null
          section?: string
          sort?: number
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      v_event_daily: {
        Row: {
          day: string | null
          event: string | null
          events: number | null
          uniques: number | null
        }
        Relationships: []
      }
      v_weekly_active: {
        Row: {
          active_users: number | null
          week_start: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _dance_night: { Args: never; Returns: string }
      _in_crew: { Args: { p_crew: string; p_user: string }; Returns: boolean }
      _is_founder: { Args: never; Returns: boolean }
      _is_verified: { Args: { p_user: string }; Returns: boolean }
      _my_venue_id: { Args: never; Returns: string }
      accept_sponsored_quest: { Args: { p_id: string }; Returns: Json }
      admin_delete_event: { Args: { p_id: string }; Returns: undefined }
      admin_delete_venue: { Args: { p_id: string }; Returns: undefined }
      admin_save_event: {
        Args: {
          p_date: string
          p_end: string
          p_genres: string[]
          p_id: string
          p_image_url: string
          p_lineup: string[]
          p_start: string
          p_title: string
          p_venue_id: string
        }
        Returns: string
      }
      admin_save_quest: {
        Args: {
          p_active: boolean
          p_description: string
          p_icon: string
          p_id: string
          p_quest_type: string
          p_target: number
          p_title: string
          p_xp: number
        }
        Returns: string
      }
      admin_save_sponsored: {
        Args: {
          p_active: boolean
          p_description: string
          p_id: string
          p_kind?: string
          p_logo: string
          p_media?: string
          p_reward_label: string
          p_rule?: string
          p_spots_label: string
          p_target: number
          p_title: string
          p_venue_name: string
          p_xp: number
        }
        Returns: string
      }
      admin_save_venue: {
        Args: {
          p_emoji: string
          p_id: string
          p_lat: number
          p_lng: number
          p_name: string
          p_neighborhood: string
          p_partner: boolean
          p_type: string
        }
        Returns: string
      }
      announce_weekly_winners: {
        Args: never
        Returns: {
          winner_id: string
          winner_name: string
          winner_rank: number
          winner_xp: number
        }[]
      }
      apply_referral: { Args: { p_code: string }; Returns: Json }
      approve_secret_party_request: {
        Args: { request_id: string }
        Returns: Json
      }
      assign_weekly_quests: { Args: never; Returns: Json }
      block_user: { Args: { p_target: string }; Returns: Json }
      both_at_venue: {
        Args: { p_a: string; p_b: string; p_venue: string }
        Returns: boolean
      }
      cast_party_of_month_vote: { Args: { p_event_id: string }; Returns: Json }
      claim_daily_streak: { Args: never; Returns: Json }
      claim_founding_raver: { Args: { p_code: string }; Returns: Json }
      claim_quest: { Args: { p_quest_id: string }; Returns: Json }
      claim_venue: { Args: { p_venue: string }; Returns: Json }
      compute_match_score: {
        Args: { p_event_id?: string; p_target_id: string; p_user_id: string }
        Returns: Json
      }
      compute_scene_health: {
        Args: { p_date?: string; p_venue_name: string }
        Returns: Json
      }
      create_custom_quest: {
        Args: {
          p_description: string
          p_icon: string
          p_is_crew: boolean
          p_kind: string
          p_target: number
          p_timeframe: string
          p_title: string
          p_xp: number
        }
        Returns: Json
      }
      create_user_quest: {
        Args: {
          p_category?: string
          p_description: string
          p_icon: string
          p_is_crew: boolean
          p_kind: string
          p_target: number
          p_timeframe: string
          p_title: string
          p_visibility: string
          p_xp: number
        }
        Returns: Json
      }
      creator_tier_for: { Args: { p_user: string }; Returns: number }
      delete_my_event: { Args: { p_id: string }; Returns: undefined }
      draw_lucky_100_winners: {
        Args: { num_winners?: number }
        Returns: {
          winner_id: string
          winner_name: string
        }[]
      }
      ensure_conversation: {
        Args: { p_initiator: string; p_target: string }
        Returns: string
      }
      flag_review: {
        Args: { p_reason?: string; p_review_id: string }
        Returns: Json
      }
      flag_story: {
        Args: { p_reason?: string; p_story_id: string }
        Returns: Json
      }
      generate_invite_code: { Args: never; Returns: string }
      get_active_stories: { Args: never; Returns: Json }
      get_beta_metrics: { Args: never; Returns: Json }
      get_campaign: { Args: { p_sponsored: string }; Returns: Json }
      get_community_quests: { Args: never; Returns: Json }
      get_conversations: { Args: never; Returns: Json }
      get_creator_status: { Args: never; Returns: Json }
      get_crew: { Args: { p_crew: string }; Returns: Json }
      get_dance_leaderboard: { Args: { p_scope?: string }; Returns: Json }
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
      get_memento_requests: { Args: never; Returns: Json }
      get_my_redemptions: {
        Args: never
        Returns: {
          code: string
          created_at: string
          icon: string
          id: string
          night: string
          reward_type: string
          status: string
          title: string
          venue_emoji: string
          venue_name: string
        }[]
      }
      get_my_referral: { Args: never; Returns: Json }
      get_my_venue: { Args: never; Returns: string }
      get_party_of_month: { Args: never; Returns: Json }
      get_party_of_month_candidates: { Args: never; Returns: Json }
      get_personalized_events: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          event_id: string
          relevance_reasons: string[]
          relevance_score: number
        }[]
      }
      get_public_profile: { Args: { p_user: string }; Returns: Json }
      get_quest_engine_stats: { Args: never; Returns: Json }
      get_received_sparks: { Args: never; Returns: Json }
      get_sparkable: { Args: { p_venue: string }; Returns: Json }
      get_streak_shield: { Args: never; Returns: Json }
      get_user_nights: { Args: { p_user: string }; Returns: Json }
      get_venue_guestlist: {
        Args: { p_night?: string; p_venue: string }
        Returns: {
          code: string
          guest_name: string
          redemption_id: string
          reward_title: string
          status: string
          unlocked: boolean
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
      get_venue_presence: { Args: { p_venue: string }; Returns: Json }
      get_venue_review_stats: { Args: { p_venue_name: string }; Returns: Json }
      get_venues: { Args: never; Returns: Json }
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
      haversine_m: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      join_community_quest: { Args: { p_quest: string }; Returns: Json }
      join_crew: { Args: { p_event?: string; p_venue?: string }; Returns: Json }
      level_from_xp: { Args: { p_xp: number }; Returns: number }
      mark_conversation_read: {
        Args: { p_conversation: string }
        Returns: undefined
      }
      nightlife_date: { Args: { p_ts?: string }; Returns: string }
      nightlife_date_of: { Args: { ts: string }; Returns: string }
      post_crew_message: {
        Args: { p_body: string; p_crew: string }
        Returns: Json
      }
      predict_crowd: { Args: { p_event_id: string }; Returns: Json }
      process_secure_checkin: {
        Args: { p_lat: number; p_lon: number; p_venue: string }
        Returns: Json
      }
      publish_venue_event: {
        Args: {
          p_date: string
          p_end: string
          p_genres: string[]
          p_image_url: string
          p_lineup: string[]
          p_start: string
          p_title: string
        }
        Returns: string
      }
      redeem_reward: { Args: { p_reward_id: string }; Returns: Json }
      report_user: {
        Args: { p_details?: string; p_reason: string; p_target: string }
        Returns: Json
      }
      request_memento: { Args: { p_memento: string }; Returns: Json }
      respond_memento_request: {
        Args: { p_approve: boolean; p_request: string }
        Returns: Json
      }
      respond_spark: { Args: { p_spark: string }; Returns: Json }
      save_dance_session: {
        Args: {
          p_duration: number
          p_moves: number
          p_score: number
          p_venue: string
          p_venue_name: string
        }
        Returns: Json
      }
      send_message: {
        Args: { p_body: string; p_conversation: string }
        Returns: Json
      }
      send_spark: { Args: { p_to: string; p_venue: string }; Returns: Json }
      send_wave: { Args: { p_target: string }; Returns: Json }
      set_venue_presence: {
        Args: { p_venue: string; p_visible: boolean }
        Returns: Json
      }
      signal_intent: {
        Args: { p_night?: string; p_venue: string }
        Returns: Json
      }
      submit_campaign: {
        Args: {
          p_caption: string
          p_media_type: string
          p_media_url: string
          p_sponsored: string
        }
        Returns: Json
      }
      submit_checkin_feedback: {
        Args: {
          p_label: string
          p_question: string
          p_score: number
          p_venue_id?: string
        }
        Returns: Json
      }
      submit_set_times: {
        Args: { p_event: string; p_times: Json }
        Returns: Json
      }
      tier_for_visibility: { Args: { p_visibility: string }; Returns: number }
      toggle_review_helpful: { Args: { p_review_id: string }; Returns: Json }
      track: {
        Args: { p_event: string; p_props?: Json; p_session?: string }
        Returns: undefined
      }
      update_my_venue: {
        Args: {
          p_cover_url: string
          p_instagram: string
          p_lat: number
          p_lng: number
        }
        Returns: undefined
      }
      verify_redemption: { Args: { p_code: string }; Returns: Json }
      verify_venue_claim: {
        Args: { p_approve: boolean; p_venue: string }
        Returns: Json
      }
      vote_campaign: { Args: { p_submission: string }; Returns: Json }
      war_add_member: {
        Args: { p_email: string; p_role: string }
        Returns: Json
      }
      war_is_member: { Args: never; Returns: boolean }
      war_remove_member: { Args: { p_user: string }; Returns: undefined }
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
