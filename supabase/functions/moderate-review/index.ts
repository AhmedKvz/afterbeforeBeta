import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BANNED_WORDS = [
  "spam", "scam", "fake", "fraud", "hack", "phishing",
];

const SPAM_PATTERNS = [
  /(.)\1{4,}/,
  /https?:\/\//,
  /[A-Z]{10,}/,
];

interface ModerationResult {
  score: number;
  flags: string[];
  status: "approved" | "pending" | "flagged";
}

function moderateReview(text: string, rating: number): ModerationResult {
  let score = 0;
  const flags: string[] = [];

  if (text.length > 0 && text.length < 5) {
    score += 0.3;
    flags.push("low_quality");
  }

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      score += 0.3;
      flags.push("spam");
      break;
    }
  }

  const lower = text.toLowerCase();
  for (const word of BANNED_WORDS) {
    if (lower.includes(word)) {
      score += 0.4;
      flags.push("toxic");
      break;
    }
  }

  if (text.length > 10 && text === text.toUpperCase()) {
    score += 0.2;
    flags.push("shouting");
  }

  if (rating === 1 && text.length < 20 && text.length > 0) {
    score += 0.2;
    flags.push("rage_review");
  }

  score = Math.min(score, 1.0);

  return {
    score,
    flags: [...new Set(flags)],
    status: score < 0.3 ? "approved" : score > 0.7 ? "flagged" : "pending",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { review_id, text, rating } = await req.json();

    if (!review_id) {
      return new Response(
        JSON.stringify({ error: "review_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = moderateReview(text || "", rating || 5);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    await supabase
      .from("event_reviews")
      .update({
        moderation_status: result.status,
        moderation_score: result.score,
        moderation_flags: result.flags,
      })
      .eq("id", review_id);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
