-- Seed data for admin console — dev/testing purposes

BEGIN;

-- 3 sources
INSERT INTO admin_sources (id, source_name, astrologer_name, source_type, url, description, trust_level, active, tags)
VALUES
  ('00000000-0000-0000-0000-000000000001',
   'Astrology Hub Podcast',
   'Amanda Pua Walsh',
   'podcast',
   'https://astrologyhub.com/podcast',
   'Weekly astrology guidance and deep dives',
   'high',
   TRUE,
   ARRAY['transit', 'natal', 'weekly']),
  ('00000000-0000-0000-0000-000000000002',
   'Saturn in Pisces Deep Dive',
   'Chani Nicholas',
   'youtube_video',
   'https://youtube.com/watch?v=mock001',
   'Full breakdown of Saturn transiting Pisces 2023–2026',
   'verified',
   TRUE,
   ARRAY['saturn', 'pisces', 'transit']),
  ('00000000-0000-0000-0000-000000000003',
   'Cosmic Intelligence Agency',
   'Various',
   'newsletter',
   'https://cosmicintelligenceagency.com',
   'Monthly forecasts and interpretation frameworks',
   'medium',
   TRUE,
   ARRAY['forecast', 'framework']);

-- 2 imports with mock transcripts
INSERT INTO admin_imports (id, source_id, import_type, title, url, status, raw_content, cleaned_content)
VALUES
  ('00000000-0000-0000-0001-000000000001',
   '00000000-0000-0000-0000-000000000002',
   'youtube_transcript',
   'Saturn in Pisces: What It Means For Every Rising Sign',
   'https://youtube.com/watch?v=mock001',
   'fetched',
   'Today we explore Saturn moving through Pisces and what that means for each rising sign. Saturn represents structure and limitation. Pisces represents dissolution and the invisible. When Saturn moves through Pisces, we are learning to hold sacred boundaries within a boundless realm.',
   'Today we explore Saturn moving through Pisces and what that means for each rising sign. Saturn represents structure and limitation. Pisces represents dissolution. When Saturn moves through Pisces we learn to hold sacred boundaries within a boundless realm.'),
  ('00000000-0000-0000-0001-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'podcast_transcript',
   'Episode 312: Navigating Eclipse Season',
   'https://astrologyhub.com/podcast/312',
   'processed',
   'Eclipse seasons are turning points where the nodes of the Moon activate destiny-line events. During eclipse season avoid major commitments and signings if possible.',
   'Eclipse seasons are turning points where the nodes of the Moon activate destiny-line events. During eclipse season avoid major commitments if possible.');

-- 6 draft cards across different categories
INSERT INTO admin_cards (id, import_id, category, title, summary, usable_copy, source_quotes, confidence_score, status, tags)
VALUES
  ('00000000-0000-0000-0002-000000000001',
   '00000000-0000-0000-0001-000000000001',
   'transit_timing',
   'Saturn in Pisces: 12th House for Aries Rising',
   'Saturn transiting the 12th house for Aries rising activates hidden patterns and karmic completion.',
   'With Saturn in your 12th house, this is a time for inner work rather than outer achievement. Hidden patterns surface. Do the work no one can see yet.',
   ARRAY['Saturn transiting the 12th house activates hidden patterns'],
   0.88,
   'draft',
   ARRAY['saturn', 'pisces', 'aries-rising', '12th-house']),
  ('00000000-0000-0000-0002-000000000002',
   '00000000-0000-0000-0001-000000000001',
   'rising_sign',
   'Aries Rising: Saturn Discipline Theme',
   'Aries rising experiences Saturn''s discipline through solitude and inner reckoning.',
   'Aries rising: Saturn is asking you to build something invisible — your inner foundation.',
   ARRAY[]::TEXT[],
   0.75,
   'draft',
   ARRAY['aries-rising', 'saturn']),
  ('00000000-0000-0000-0002-000000000003',
   '00000000-0000-0000-0001-000000000001',
   'house',
   '12th House Saturn: Solitude as Productivity',
   'When Saturn transits the 12th house, withdrawal becomes the most productive stance.',
   'Your most important work happens away from public view. Honor the need for solitude.',
   ARRAY[]::TEXT[],
   0.82,
   'draft',
   ARRAY['12th-house', 'saturn', 'solitude']),
  ('00000000-0000-0000-0002-000000000004',
   '00000000-0000-0000-0001-000000000002',
   'transit_timing',
   'Eclipse Season: Fate-Line Activation',
   'Eclipses activate nodes of the Moon, triggering major life pivots and destiny moments.',
   'Eclipse seasons mark moments when the ordinary rules shift. Avoid forcing decisions — let events reveal themselves.',
   ARRAY['Eclipse seasons are turning points where the nodes activate destiny-line events'],
   0.91,
   'draft',
   ARRAY['eclipse', 'nodes', 'timing']),
  ('00000000-0000-0000-0002-000000000005',
   '00000000-0000-0000-0001-000000000002',
   'planner_translation',
   'Eclipse Window: Lower-Stakes Decision Making',
   'During eclipse windows, major irreversible decisions should be delayed or observed.',
   'Eclipse window active. Use this period to gather information and observe — not to finalize or commit.',
   ARRAY[]::TEXT[],
   0.85,
   'draft',
   ARRAY['eclipse', 'planner', 'decisions']),
  ('00000000-0000-0000-0002-000000000006',
   NULL,
   'general_framework',
   'Retrograde Periods: Review Not Launch',
   'Core framework: retrograde periods are for review, revision, and reconnection.',
   'Retrograde season: revisit, revise, reconnect. Hold off on new launches when possible.',
   ARRAY[]::TEXT[],
   0.95,
   'draft',
   ARRAY['retrograde', 'framework', 'timing']);

-- 2 approved cards
UPDATE admin_cards
SET status = 'approved'
WHERE id IN (
  '00000000-0000-0000-0002-000000000004',
  '00000000-0000-0000-0002-000000000006'
);

-- 2 planner mappings
INSERT INTO admin_planner_mappings (card_id, planner_layer, use_case, default_eligible, customized_only, priority_weight)
VALUES
  ('00000000-0000-0000-0002-000000000004', 'week', 'eclipse-window', TRUE, FALSE, 80),
  ('00000000-0000-0000-0002-000000000006', 'month', 'retrograde-note', TRUE, FALSE, 70);

COMMIT;
