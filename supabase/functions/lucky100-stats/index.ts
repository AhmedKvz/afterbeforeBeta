import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current ISO week number and year
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    const year = now.getFullYear();

    // Get total count for this week
    const { count, error: countError } = await supabase
      .from('lucky_100_entries')
      .select('*', { count: 'exact', head: true })
      .eq('week_number', weekNumber)
      .eq('year', year);

    if (countError) {
      console.error('Count error:', countError);
      throw countError;
    }

    // Get last 5 entries with profile info for social proof
    const { data: recentEntries, error: entriesError } = await supabase
      .from('lucky_100_entries')
      .select(`
        id,
        user_id,
        entry_date
      `)
      .eq('week_number', weekNumber)
      .eq('year', year)
      .order('entry_date', { ascending: false })
      .limit(5);

    if (entriesError) {
      console.error('Entries error:', entriesError);
      throw entriesError;
    }

    // Get profile info for recent entries
    const userIds = recentEntries?.map(e => e.user_id) || [];
    let recentProfiles: { user_id: string; display_name: string; avatar_url: string | null }[] = [];
    
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      if (!profilesError && profiles) {
        recentProfiles = profiles;
      }
    }

    // Combine entry data with profiles
    const recentEntriesWithProfiles = recentEntries?.map(entry => {
      const profile = recentProfiles.find(p => p.user_id === entry.user_id);
      return {
        id: entry.id,
        user_id: entry.user_id,
        display_name: profile?.display_name || 'Anonymous',
        avatar_url: profile?.avatar_url,
        entry_date: entry.entry_date,
      };
    }) || [];

    console.log(`Lucky 100 stats: ${count} entries this week, ${recentEntriesWithProfiles.length} recent`);

    return new Response(
      JSON.stringify({
        count: count || 0,
        weekNumber,
        year,
        recentEntries: recentEntriesWithProfiles,
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
