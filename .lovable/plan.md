## Full Review System for AfterBefore

Build a comprehensive review system that works across all venue types (clubs, restaurants, cafes, bars, event venues, food corners, after-places).

### 1. Database (migration)

Extend `event_reviews` and add new tables. Use `venue_name` as the place identifier (existing pattern) plus optional `event_id`.

**Extend `event_reviews`:**
- `vibe_tags TEXT[]` — category-specific tags
- `visit_date DATE`
- `venue_name TEXT` — denormalized for venue-level queries
- `venue_type TEXT` — club/restaurant/cafe/bar/venue/afterplace
- `verified_visit BOOLEAN DEFAULT false` — true if user checked in or has signal/wishlist for event
- `helpful_count INT DEFAULT 0`
- `report_count INT DEFAULT 0`
- `weight NUMERIC DEFAULT 1.0` — 2.0 if verified, 1.0 if not
- Unique partial index to prevent duplicate per user/event within 24h

**New tables:**
- `review_photos` (id, review_id, photo_url, position, created_at)
- `review_votes` (id, review_id, user_id, vote_type 'helpful', unique(review_id,user_id))
- `review_reports` (id, review_id, user_id, reason, details, status, created_at)
- `business_replies` (id, review_id, venue_name, replier_id, reply_text, created_at, updated_at)
- `venue_review_summary` (venue_name PK, summary_json, computed_at) — AI-generated cache

**Functions:**
- `get_venue_review_stats(venue_name)` — returns avg_rating (weighted), review_count, verified_count, tag_frequency
- `mark_verified_visit()` trigger on insert: check `event_checkins`, `event_signals`, `event_wishlists` for that user+event
- `compute_venue_review_summary(venue_name)` — AI summary (server-side via edge fn, store result)
- `vote_review_helpful(review_id)` — idempotent helpful vote

**Storage bucket:** `review-photos` (public read, auth insert in own folder).

**RLS:**
- review_photos: public select, owner insert/delete (joined to review.user_id)
- review_votes: public select, auth insert/delete own
- review_reports: owner select/insert; admins select all
- business_replies: public select; venue owner insert/update (host_id check via profiles.account_type='club_venue' + matching venue_name)

### 2. Edge functions

- `moderate-review` (existing) — extend with vibe_tags + photo URL checks
- `summarize-venue-reviews` — uses Lovable AI Gateway (`google/gemini-2.5-flash`) to produce:
  - `best_for`, `top_positives`, `common_complaints`, `best_nights`
- Triggered on demand (cached for 24h via `venue_review_summary.computed_at`)

### 3. Shared frontend module: `src/components/reviews/`

- `VENUE_REVIEW_TAGS` — tag dictionary per venue_type
- `VenueReviewsSection.tsx` — average stars, count, AI summary card, filters bar, sorted list, "Write Review" CTA, pagination
- `ReviewCard.tsx` — stars, user, verified badge, visit_date, text, tags, photo grid, helpful button, report button, business reply nested
- `ReviewFiltersBar.tsx` — Newest / Highest / Lowest / With Photos / Verified
- `WriteReviewModal.tsx` — replaces/extends current `ReviewModal` with: tag chips (filtered by venue_type), photo upload (up to 4), visit date picker
- `AIVenueSummaryCard.tsx` — fetches/triggers `summarize-venue-reviews`
- `ReportReviewDialog.tsx` — reason select + details
- `BusinessReplyBox.tsx` — shown on venue owner's own reviews
- `VerifiedVisitBadge.tsx`

### 4. Integration points

Add `<VenueReviewsSection venueName venueType eventId? />` to:
- `EventDetail.tsx` (already partially wired — replace with new section)
- `VenueDashboard.tsx` (owner sees reviews + reply box)
- New `VenueDetail.tsx` page (route `/venue/:venueName`) — central place profile so cafes/bars/food-corners that aren't events also have reviews
- `Home.tsx` / `EventCard.tsx` — clicking a venue chip routes to `/venue/:venueName`
- Add `Reviews` tab on profile (optional, low priority)

### 5. Ranking & weight

- Update `compute_scene_health` and trending utilities to use weighted avg (verified×2)
- `get_personalized_events` already references reviews; no change needed

### 6. Styling

Dark glass cards (existing `GlassCard`), neon purple/pink accent on star fills, gold accent on Verified badge, Framer Motion stagger on review list, `🤖 AI` chip on summary card.

### Out of scope
- Editing/deleting business replies UI beyond a single reply per review
- Admin moderation dashboard (reports just collected; flagging surfaces via existing moderation_status)
- Photo EXIF stripping (basic upload only)
