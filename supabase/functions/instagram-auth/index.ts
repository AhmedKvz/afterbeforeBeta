import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code, user_id } = await req.json();

    if (!code || !user_id) {
      return new Response(JSON.stringify({ error: 'Missing code or user_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const INSTAGRAM_APP_ID = Deno.env.get('INSTAGRAM_APP_ID');
    const INSTAGRAM_APP_SECRET = Deno.env.get('INSTAGRAM_APP_SECRET');

    if (!INSTAGRAM_APP_ID || !INSTAGRAM_APP_SECRET) {
      return new Response(JSON.stringify({ error: 'Instagram not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Exchange code for access token
    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: INSTAGRAM_APP_ID,
        client_secret: INSTAGRAM_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: `${req.headers.get('origin')}/auth/instagram/callback`,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return new Response(JSON.stringify({ error: 'Failed to get token', details: tokenData }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user profile
    const profileRes = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${tokenData.access_token}`
    );
    const profileData = await profileRes.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Upsert instagram_connections
    await supabaseAdmin.from('instagram_connections').upsert({
      user_id,
      instagram_handle: profileData.username,
      instagram_id: profileData.id,
      access_token: tokenData.access_token,
      is_verified: true,
      connected_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    // Update profile
    await supabaseAdmin.from('profiles').update({
      instagram_handle: profileData.username,
      instagram_verified: true,
      is_verified: true,
      verification_date: new Date().toISOString(),
    }).eq('user_id', user_id);

    return new Response(JSON.stringify({ success: true, username: profileData.username }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
