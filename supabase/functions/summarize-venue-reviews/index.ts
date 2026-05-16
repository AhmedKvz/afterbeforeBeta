import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { venue_name, force } = await req.json();
    if (!venue_name) {
      return new Response(JSON.stringify({ error: "venue_name required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check cache (24h)
    if (!force) {
      const { data: cached } = await supabase
        .from("venue_review_summary")
        .select("summary, computed_at")
        .eq("venue_name", venue_name)
        .maybeSingle();

      if (cached) {
        const age = Date.now() - new Date(cached.computed_at).getTime();
        if (age < 24 * 60 * 60 * 1000) {
          return new Response(JSON.stringify({ ...cached.summary, cached: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Fetch recent reviews
    const { data: reviews } = await supabase
      .from("event_reviews")
      .select("rating, review_text, vibe_tags, visit_date, verified_visit")
      .eq("venue_name", venue_name)
      .order("created_at", { ascending: false })
      .limit(60);

    if (!reviews || reviews.length < 3) {
      const fallback = {
        best_for: [],
        top_positives: [],
        common_complaints: [],
        best_nights: [],
        not_enough_data: true,
      };
      return new Response(JSON.stringify(fallback), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reviewBlob = reviews
      .map((r, i) => `#${i + 1} (${r.rating}★${r.verified_visit ? " verified" : ""}) tags:[${(r.vibe_tags || []).join(",")}] ${r.review_text || ""}`)
      .join("\n");

    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You analyze venue/club reviews and return STRICT JSON only. Schema: {best_for: string[3], top_positives: string[3], common_complaints: string[3], best_nights: string[2]}. Each item under 8 words. Tone: punchy nightlife.",
          },
          { role: "user", content: `Venue: ${venue_name}\nReviews:\n${reviewBlob}\n\nReturn JSON only.` },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return new Response(JSON.stringify({ error: "AI failed", detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content || "{}";
    let summary: any;
    try {
      const cleaned = content.replace(/```json|```/g, "").trim();
      summary = JSON.parse(cleaned);
    } catch {
      summary = { best_for: [], top_positives: [], common_complaints: [], best_nights: [] };
    }

    await supabase
      .from("venue_review_summary")
      .upsert({ venue_name, summary, computed_at: new Date().toISOString() }, { onConflict: "venue_name" });

    return new Response(JSON.stringify({ ...summary, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
