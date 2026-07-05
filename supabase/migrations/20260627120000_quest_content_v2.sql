-- ============================================================
-- Quest content v2 — from generic counters to a content engine
-- Principles (ECONOMY.md + PARTNERS.md + raver laws):
--  * quest = content brief: every quest OUTPUTS something the app/scene uses
--    (review/intel, story, dance data, presence, crew density)
--  * scene voice, Serbian — no homework tone
--  * sponsored = REAL partners only (Kult / Para / 25 Bar), open frame
--  * same tracking engine (quest_type ← incrementQuestProgress), so no
--    mechanical changes — plus two newly wired types: 'dance', 'story'
-- ============================================================

-- 1. Retire the old generic English seeds (keep rows for history/FKs)
UPDATE public.quests SET is_active = false
WHERE title IN ('Weekend Warrior','Social Spark','Scene Reporter','Vibe Check','Explorer','Hype Builder','Connector');

-- 2. New weekly quest set — content-out, scene voice
INSERT INTO public.quests (title, description, quest_type, target_count, xp_reward, icon)
SELECT v.title, v.description, v.quest_type, v.target_count, v.xp_reward, v.icon
FROM (VALUES
  ('Vikend ritual',      'Dve noći ove nedelje. Grad pamti ko dolazi.',                                    'check_in', 2, 200, '📍'),
  ('Novi teren',         'Uđi u 2 mesta na kojima ove nedelje nisi bio. Scena je veća od tvog kraja.',     'explore',  2, 200, '🗺️'),
  ('Iz prve ruke',       'Napiši 2 recenzije sa noći na kojima si BIO. Turisti čitaju Reddit — neka čitaju tebe.', 'review', 2, 250, '✍️'),
  ('Najavi se',          'Reci „idem" za 3 događaja — ekipa se skuplja oko najave.',                        'signal',   3, 150, '🚀'),
  ('Iskra na podijumu',  '3 nova sparka ove nedelje. Prozor je večeras — ne sutra na IG-u.',               'match',    3, 300, '✨'),
  ('Prvi talas',         'Uzvrati wave dvoma — neka veza krene dok noć diše.',                              'social',   2, 100, '👋'),
  ('Pomeri pod',         'Odradi Dance Floor sesiju na žurci. Telefon meri — pod pamti.',                   'dance',    1, 250, '🕺'),
  ('Trag od 24h',        'Ostavi story sa noći. Scena dokumentuje samu sebe.',                              'story',    1, 150, '📸')
) AS v(title, description, quest_type, target_count, xp_reward, icon)
WHERE NOT EXISTS (SELECT 1 FROM public.quests q WHERE q.title = v.title);

-- 3. Party-of-month vote quest → scene voice (keep type/mechanics)
UPDATE public.quests
SET title = 'Tvoj glas, tvoja scena',
    description = 'Glasaj za žurku meseca. Ovde publika bira — ne organizator.'
WHERE quest_type = 'vote_best_party';

-- 4. Sponsored: retire demo seeds for non-partners, real partners only
UPDATE public.sponsored_quests SET is_active = false WHERE code IN ('drugstore_50','kafeterija_reg');

UPDATE public.sponsored_quests
SET title = 'Dovedi ekipu', description = 'Dođite u 3+ zajedno — ekipa ulazi bez reda.',
    reward_label = 'Skip-the-line ×4', spots_label = 'Samo vikendom'
WHERE code = 'para_crew';

INSERT INTO public.sponsored_quests (code, venue_name, logo, hue, title, description, reward_label, target_count, xp_reward, spots_label, sort) VALUES
  ('kult_first50', 'Kult',   '🎵', 282, 'Prvih 50 na vratima', 'Čekiraj se pre 00:30 — noć počinje dok je pod još tvoj.', 'Welcome shot', 1, 120, '50 mesta', 1),
  ('bar25_before', '25 Bar', '🍸', 38,  'Before ritual',       'Check-in u baru pre kluba, 2× ove nedelje.',              'Koktel na račun kuće', 2, 150, 'Neograničeno', 2)
ON CONFLICT (code) DO NOTHING;
