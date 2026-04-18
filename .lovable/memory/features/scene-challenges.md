---
name: Scene Challenges
description: Sponzorisani i community izazovi sa fazama Live → Voting → Resolved, glasanje 1 glas po korisniku
type: feature
---
Tabele: `challenges` (status: live/voting/resolved, prize_pool_cents, sponsor_*), `challenge_entries` (vote_count cached), `challenge_votes` (UNIQUE challenge_id+user_id).
RPC `vote_on_challenge_entry` proverava status='voting', deadline, da nije sopstveni entry, i unique vote.
Rute: `/challenges` (tabovi Live/Voting/Resolved), `/challenges/:id` (detail sa rangiranim entry-jima).
Glasanje samo dok je status='voting'. Pobednik označen `winner_entry_id` ili top entry kad je resolved.
