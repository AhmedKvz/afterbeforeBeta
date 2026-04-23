import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    // Get counter stats
    const { data: counter, error: counterError } = await supabase
      .from('lucky100_counter')
      .select('*')
      .limit(1)
      .single();

    if (counterError) {
      console.error('Counter error:', counterError);
      throw counterError;
    }

    const globalCount = counter?.global_count ?? 0;
    const lastWinnerCount = counter?.last_winner_count ?? 0;
    const luckyInterval = 5;
    const nextLuckyNumber = Math.ceil((globalCount + 1) / luckyInterval) * luckyInterval;
    const checkInsToNext = nextLuckyNumber - globalCount;

    // Get last 10 winners with profile info
    const { data: winners, error: winnersError } = await supabase
      .from('lucky100_winners')
      .select('id, user_id, check_in_number, won_at, prize_claimed')
      .order('won_at', { ascending: false })
      .limit(10);

    if (winnersError) {
      console.error('Winners error:', winnersError);
      throw winnersError;
    }

    // Get profile info for winners
    const userIds = winners?.map(w => w.user_id) || [];
    let winnersWithProfiles: any[] = [];
    
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      if (!profilesError && profiles) {
        winnersWithProfiles = winners?.map(winner => {
          const profile = profiles.find(p => p.user_id === winner.user_id);
          return {
            ...winner,
            display_name: profile?.display_name || 'Anonymous',
            avatar_url: profile?.avatar_url,
          };
        }) || [];
      }
    }

    console.log(`Lucky 100 stats: ${globalCount} check-ins, next winner at #${nextLuckyNumber}, ${winnersWithProfiles.length} recent winners`);

    return new Response(
      JSON.stringify({
        globalCount,
        lastWinnerCount,
        nextLuckyNumber,
        checkInsToNext,
        recentWinners: winnersWithProfiles,
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
