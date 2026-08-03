-- =========================================================================
-- LAMS — DEMO / TEST DATASET
-- =========================================================================
-- Every row created here is unmistakably fake:
--   * every name starts with "[TEST]"
--   * every id starts with "demo-"
--   * every email uses the reserved, non-routable domain @example.test
-- so a client can never confuse it with real agency data.
--
-- It fills EVERY page: Dashboard, Athletes (+ full profile: overview,
-- competitions, passports & visas, history, whereabouts), Competitions
-- (+ detail), Calendar, Documents and the notification bell.
--
-- Dates are RELATIVE to the day you run this (current_date), so the demo never
-- goes stale: there is always a past season, a race today, and races coming up.
--
-- HOW TO RUN
--   1. schema.sql                            (once, creates the tables)
--   2. add-followedby-whereabouts-pbmeta.sql (only if your DB predates those columns)
--   3. reset-data.sql                        (optional — wipes everything first)
--   4. this file                             (re-running it is safe: it replaces
--                                             its own demo- rows, and never
--                                             touches rows you created yourself)
--
-- TO REMOVE THE DEMO DATA LATER, run just the delete block at the top of the
-- do $$ below — or: delete from public.athletes where id like 'demo-%';
--                   delete from public.competitions where id like 'demo-%';
--                   delete from public.organizers where id like 'demo-%';
--                   delete from public.documents where id like 'demo-%';
--                   delete from public.calendar_events where id like 'demo-%';
-- =========================================================================

do $$
declare
  uid uuid := (select id from auth.users order by created_at limit 1);
  d0  date := current_date;
  -- Competition dates: four in the past, one today, three ahead.
  c1d text := to_char(current_date - 210, 'YYYY-MM-DD'); -- last autumn marathon
  c2d text := to_char(current_date - 120, 'YYYY-MM-DD'); -- half marathon
  c3d text := to_char(current_date -  45, 'YYYY-MM-DD'); -- track meeting
  c4d text := to_char(current_date -  20, 'YYYY-MM-DD'); -- cross
  c5d text := to_char(current_date       , 'YYYY-MM-DD'); -- TODAY — live
  c6d text := to_char(current_date +  12, 'YYYY-MM-DD'); -- in 12 days
  c7d text := to_char(current_date +  95, 'YYYY-MM-DD');
  c8d text := to_char(current_date + 400, 'YYYY-MM-DD'); -- next year
begin
  if uid is null then
    raise exception 'No auth user found. Sign up / create your account first, then re-run this file.';
  end if;

  -- ---- Make this file re-runnable: clear the previous demo rows ----------
  -- (race_entries, visas and passports cascade from athletes/competitions.)
  delete from public.documents       where id like 'demo-%';
  delete from public.calendar_events where id like 'demo-%';
  delete from public.race_entries    where id like 'demo-%';
  delete from public.visas           where id like 'demo-%';
  delete from public.passports       where id like 'demo-%';
  delete from public.competitions    where id like 'demo-%';
  delete from public.athletes        where id like 'demo-%';
  delete from public.organizers      where id like 'demo-%';

  -- =======================================================================
  -- ORGANIZERS
  -- =======================================================================
  insert into public.organizers (id, user_id, name, first_name, last_name, email, phone, nation) values
    ('demo-org-1', uid, '[TEST] Milano Meeting Office', 'Marco',  'Rossi',   'demo.organizer1@example.test', '+39 02 1111 1111', 'ITA'),
    ('demo-org-2', uid, '[TEST] Berlin Track Bureau',   'Anna',   'Schmidt', 'demo.organizer2@example.test', '+49 30 2222 2222', 'GER'),
    ('demo-org-3', uid, '[TEST] Valencia Road Desk',    'Pablo',  'Garcia',  'demo.organizer3@example.test', '+34 96 333 3333',  'ESP');

  -- =======================================================================
  -- ATHLETES — six profiles, every field filled, all four statuses present.
  -- Ages are derived from the date of birth so they stay correct over time.
  -- =======================================================================
  insert into public.athletes (
    id, user_id, first, last, initials, color, nationality, dob, age, gender, specialty, category, squad, status,
    disciplines, joined, pb, pb_meta, whereabouts, medals, next_event, coach, progress, bio, contact, email,
    contract, place_of_birth, residence, marital_status, employment, tax_code, fidal_number, club,
    height, height_unit, weight, weight_unit, sponsor, shoe_size, clothing_size
  ) values
    ('demo-ath-1', uid, '[TEST] Aster', 'Bekele', 'AB', '#5b6ef5', 'Ethiopia', '1996-04-12',
      extract(year from age(current_date, date '1996-04-12'))::int, 'F', 'Marathon', 'long', 'Senior', 'active',
      '["Marathon","Half Marathon","10 Km"]'::jsonb, to_char(current_date - 1500, 'YYYY-MM-DD'),
      '{"Marathon":"2h21''40\"","Half Marathon":"1h07''12\"","10 Km":"31''05\""}'::jsonb,
      ('{"Marathon":{"competitionId":"demo-comp-1","date":"' || c1d || '","place":2,"venue":"Valencia"},'
       || '"Half Marathon":{"competitionId":"demo-comp-2","date":"' || c2d || '","place":1,"venue":"Milano"}}')::jsonb,
      ('{"address":"[TEST] Via delle Olimpiadi 12, 04016 Sabaudia LT, Italy","availableFrom":"06:00","availableTo":"07:00","fromDate":"'
       || to_char(d0 - 30, 'YYYY-MM-DD') || '","toDate":"' || to_char(d0 + 150, 'YYYY-MM-DD')
       || '","note":"[TEST] Training camp base. Morning slot at the residence, before track session.","updated":"'
       || to_char(d0 - 6, 'YYYY-MM-DD') || '"}')::jsonb,
      '{"gold":1,"silver":1,"bronze":0}'::jsonb, '', '[TEST] Coach Gemedu Dedefo', 82,
      '[TEST] DEMO PROFILE — not a real athlete. Marathon specialist, moved to the European road circuit in 2021. Personal best set in Valencia.',
      '{"email":"demo.athlete1@example.test","phone":"+39 333 111 0001"}'::jsonb, 'demo.athlete1@example.test',
      'E', 'Addis Ababa, Ethiopia', 'Sabaudia, Italy', 'Single', 'Full-time athlete', 'BKLSTR96D52Z315K', 'ET-100001',
      '[TEST] Lane2 Racing Team', 168, 'cm', 50, 'kg', '[TEST] Demo Sportswear', '39', 'S'),

    ('demo-ath-2', uid, '[TEST] Yonas', 'Tadesse', 'YT', '#22c55e', 'Ethiopia', '1999-09-30',
      extract(year from age(current_date, date '1999-09-30'))::int, 'M', '5000 m', 'long', 'Senior', 'active',
      '["5000 m","10000 m","10 Km","Cross"]'::jsonb, to_char(current_date - 1100, 'YYYY-MM-DD'),
      '{"5000 m":"13:05.44","10000 m":"27:12.60","10 Km":"28''10\""}'::jsonb,
      ('{"5000 m":{"competitionId":"demo-comp-3","date":"' || c3d || '","place":2,"venue":"Berlin"}}')::jsonb,
      ('{"address":"[TEST] Viale dei Pini 4, 00135 Roma RM, Italy","availableFrom":"05:30","availableTo":"06:30","fromDate":"'
       || to_char(d0 - 10, 'YYYY-MM-DD') || '","toDate":"' || to_char(d0 + 90, 'YYYY-MM-DD')
       || '","note":"[TEST] Lives at the federation dormitory during the track season.","updated":"'
       || to_char(d0 - 2, 'YYYY-MM-DD') || '"}')::jsonb,
      '{"gold":0,"silver":1,"bronze":0}'::jsonb, '', '[TEST] Coach Gemedu Dedefo', 74,
      '[TEST] DEMO PROFILE — not a real athlete. Track distance runner stepping up to the 10 000 m this season.',
      '{"email":"demo.athlete2@example.test","phone":"+39 333 111 0002"}'::jsonb, 'demo.athlete2@example.test',
      'M', 'Bekoji, Ethiopia', 'Roma, Italy', 'Single', 'Full-time athlete', 'TDSYNS99P30Z315R', 'ET-100002',
      '[TEST] Lane2 Racing Team', 175, 'cm', 58, 'kg', '[TEST] Demo Sportswear', '42', 'M'),

    ('demo-ath-3', uid, '[TEST] Giulia', 'Ferrari', 'GF', '#f59e0b', 'Italy', '2001-01-22',
      extract(year from age(current_date, date '2001-01-22'))::int, 'F', '1500 m', 'middle', 'Under 23', 'active',
      '["800 m","1500 m","3000 m"]'::jsonb, to_char(current_date - 700, 'YYYY-MM-DD'),
      '{"800 m":"2:01.88","1500 m":"4:02.35","3000 m":"8:58.20"}'::jsonb,
      ('{"1500 m":{"competitionId":"demo-comp-3","date":"' || c3d || '","place":3,"venue":"Berlin"},'
       || '"800 m":{"competitionId":"demo-comp-3","date":"' || c3d || '","place":5,"venue":"Berlin"}}')::jsonb,
      ('{"address":"[TEST] Corso Vittorio Emanuele 88, 20122 Milano MI, Italy","availableFrom":"07:00","availableTo":"08:00","fromDate":"'
       || to_char(d0 - 60, 'YYYY-MM-DD') || '","toDate":"' || to_char(d0 + 120, 'YYYY-MM-DD')
       || '","note":"[TEST] University term — at home before lectures.","updated":"'
       || to_char(d0 - 14, 'YYYY-MM-DD') || '"}')::jsonb,
      '{"gold":0,"silver":0,"bronze":1}'::jsonb, '', '[TEST] Coach Laura Conti', 66,
      '[TEST] DEMO PROFILE — not a real athlete. Italian middle-distance runner, U23 national finalist.',
      '{"email":"demo.athlete3@example.test","phone":"+39 333 111 0003"}'::jsonb, 'demo.athlete3@example.test',
      NULL, 'Milano, Italy', 'Milano, Italy', 'Single', 'Student', 'FRRGLI01A62F205X', 'IT-244881',
      '[TEST] Atletica Milano Demo', 170, 'cm', 54, 'kg', '[TEST] Demo Running Co', '38', 'S'),

    ('demo-ath-4', uid, '[TEST] Marco', 'Greco', 'MG', '#ef4444', 'Italy', '1993-06-08',
      extract(year from age(current_date, date '1993-06-08'))::int, 'M', 'Half Marathon', 'long', 'Senior', 'injury',
      '["10 Km","Half Marathon","Marathon"]'::jsonb, to_char(current_date - 2100, 'YYYY-MM-DD'),
      '{"10 Km":"28''44\"","Half Marathon":"1h02''15\"","Marathon":"2h11''30\""}'::jsonb,
      ('{"Half Marathon":{"competitionId":"demo-comp-2","date":"' || c2d || '","place":4,"venue":"Milano"},'
       || '"Marathon":{"competitionId":"demo-comp-1","date":"' || c1d || '","place":9,"venue":"Valencia"}}')::jsonb,
      ('{"address":"[TEST] Via Garibaldi 3, 50123 Firenze FI, Italy","availableFrom":"06:30","availableTo":"07:30","fromDate":"'
       || to_char(d0 - 25, 'YYYY-MM-DD') || '","toDate":"' || to_char(d0 + 60, 'YYYY-MM-DD')
       || '","note":"[TEST] Rehab period — physio appointments most mornings after 09:00.","updated":"'
       || to_char(d0 - 21, 'YYYY-MM-DD') || '"}')::jsonb,
      '{"gold":0,"silver":0,"bronze":0}'::jsonb, '', '[TEST] Coach Laura Conti', 41,
      '[TEST] DEMO PROFILE — not a real athlete. Currently out with a calf strain; return planned for the autumn road season.',
      '{"email":"demo.athlete4@example.test","phone":"+39 333 111 0004"}'::jsonb, 'demo.athlete4@example.test',
      NULL, 'Firenze, Italy', 'Firenze, Italy', 'Married', 'Part-time coach', 'GRCMRC93H08D612B', 'IT-198220',
      '[TEST] Atletica Firenze Demo', 178, 'cm', 62, 'kg', '[TEST] Demo Running Co', '43', 'M'),

    ('demo-ath-5', uid, '[TEST] Naomi', 'Kiptoo', 'NK', '#a855f7', 'Kenya', '1997-11-03',
      extract(year from age(current_date, date '1997-11-03'))::int, 'F', 'Half Marathon', 'long', 'Senior', 'inactive',
      '["Half Marathon","Marathon"]'::jsonb, to_char(current_date - 900, 'YYYY-MM-DD'),
      '{"Half Marathon":"1h08''40\"","Marathon":"2h24''55\""}'::jsonb,
      ('{"Half Marathon":{"competitionId":"demo-comp-2","date":"' || c2d || '","place":3,"venue":"Milano"},'
       || '"Marathon":{"competitionId":"demo-comp-1","date":"' || c1d || '","place":5,"venue":"Valencia"}}')::jsonb,
      ('{"address":"[TEST] Kaptagat Training Camp, Elgeyo-Marakwet, Kenya","availableFrom":"06:00","availableTo":"07:00","fromDate":"'
       || to_char(d0 - 90, 'YYYY-MM-DD') || '","toDate":"' || to_char(d0 + 30, 'YYYY-MM-DD')
       || '","note":"[TEST] Off-season at home camp in Kenya. Reachable on the camp landline.","updated":"'
       || to_char(d0 - 40, 'YYYY-MM-DD') || '"}')::jsonb,
      '{"gold":0,"silver":0,"bronze":1}'::jsonb, '', '[TEST] Coach Sangita Ochieng', 58,
      '[TEST] DEMO PROFILE — not a real athlete. Taking a planned break after the spring campaign; returns for the marathon in the spring.',
      '{"email":"demo.athlete5@example.test","phone":"+254 700 111 005"}'::jsonb, 'demo.athlete5@example.test',
      'E', 'Eldoret, Kenya', 'Eldoret, Kenya', 'Married', 'Full-time athlete', 'KPTNMO97S43Z322D', 'KE-500145',
      '[TEST] Lane2 Racing Team', 165, 'cm', 48, 'kg', '[TEST] Demo Sportswear', '38', 'XS'),

    ('demo-ath-6', uid, '[TEST] Sara', 'Nardi', 'SN', '#06b6d4', 'Italy', '1995-02-17',
      extract(year from age(current_date, date '1995-02-17'))::int, 'F', 'Cross', 'long', 'Senior', 'pregnant',
      '["Cross","3000 m","5000 m"]'::jsonb, to_char(current_date - 1800, 'YYYY-MM-DD'),
      '{"Cross":"26''40\"","3000 m":"9:05.10","5000 m":"15:22.10"}'::jsonb,
      ('{"Cross":{"competitionId":"demo-comp-4","date":"' || c4d || '","place":4,"venue":"Roma"},'
       || '"5000 m":{"competitionId":"demo-comp-3","date":"' || c3d || '","place":7,"venue":"Berlin"}}')::jsonb,
      ('{"address":"[TEST] Via Appia Nuova 210, 00183 Roma RM, Italy","availableFrom":"08:00","availableTo":"09:00","fromDate":"'
       || to_char(d0 - 45, 'YYYY-MM-DD') || '","toDate":"' || to_char(d0 + 200, 'YYYY-MM-DD')
       || '","note":"[TEST] Maternity leave — light training only, available at home in the morning.","updated":"'
       || to_char(d0 - 9, 'YYYY-MM-DD') || '"}')::jsonb,
      '{"gold":0,"silver":0,"bronze":0}'::jsonb, '', '[TEST] Coach Laura Conti', 35,
      '[TEST] DEMO PROFILE — not a real athlete. On maternity leave; cross-country return targeted for next winter.',
      '{"email":"demo.athlete6@example.test","phone":"+39 333 111 0006"}'::jsonb, 'demo.athlete6@example.test',
      NULL, 'Roma, Italy', 'Roma, Italy', 'Married', 'Physiotherapist', 'NRDSRA95B57H501Y', 'IT-201774',
      '[TEST] Atletica Roma Demo', 172, 'cm', 53, 'kg', '[TEST] Demo Running Co', '39', 'M');

  -- =======================================================================
  -- COMPETITIONS — a full season: four run, one live today, three to come
  -- (including one next year). Every category, level and "followed by" used.
  -- =======================================================================
  insert into public.competitions (
    id, user_id, name, short, location, country, date, end_date, type, tier, status, entries, results,
    events, summary, category, level, organizer_id, contact_surname, contact_name, contact_phone, contact_email,
    disciplines, web_site, notes, followed_by
  ) values
    ('demo-comp-1', uid, '[TEST] Valencia Marathon', 'VLC', 'Valencia', 'ESP', c1d, c1d, 'Road', 'tier-1', 'completed', 3, 3,
      '["Marathon"]'::jsonb, '{"gold":0,"silver":1,"bronze":0,"points":18}'::jsonb, 'marathon', 'Gold', 'demo-org-3',
      'Garcia', 'Pablo', '+34 96 333 3333', 'demo.organizer3@example.test',
      ('[{"discipline":"Marathon","gender":"W","date":"' || c1d || '"},{"discipline":"Marathon","gender":"M","date":"' || c1d || '"}]')::jsonb,
      'https://example.test/valencia-demo', '[TEST] Demo competition. Flat, fast course — agency''s main autumn marathon target.', 'Rosella'),

    ('demo-comp-2', uid, '[TEST] Milano City Half Marathon', 'MIL', 'Milano', 'ITA', c2d, c2d, 'Road', 'tier-2', 'completed', 3, 3,
      '["Half Marathon"]'::jsonb, '{"gold":1,"silver":0,"bronze":1,"points":24}'::jsonb, 'half-marathon', 'Silver', 'demo-org-1',
      'Rossi', 'Marco', '+39 02 1111 1111', 'demo.organizer1@example.test',
      ('[{"discipline":"Half Marathon","gender":"W","date":"' || c2d || '"},{"discipline":"Half Marathon","gender":"M","date":"' || c2d || '"}]')::jsonb,
      'https://example.test/milano-demo', '[TEST] Demo competition. City half marathon, elite field, appearance fee agreed.', 'Hounda'),

    ('demo-comp-3', uid, '[TEST] Berlin Golden Meeting', 'BER', 'Berlin', 'GER', c3d, c3d, 'Track', 'tier-1', 'completed', 4, 4,
      '["800 m","1500 m","5000 m"]'::jsonb, '{"gold":0,"silver":1,"bronze":1,"points":21}'::jsonb, 'meeting', 'DL', 'demo-org-2',
      'Schmidt', 'Anna', '+49 30 2222 2222', 'demo.organizer2@example.test',
      ('[{"discipline":"800 m","gender":"W","date":"' || c3d || '"},{"discipline":"1500 m","gender":"W","date":"' || c3d
       || '"},{"discipline":"5000 m","gender":"M","date":"' || c3d || '"},{"discipline":"5000 m","gender":"W","date":"' || c3d || '"}]')::jsonb,
      'https://example.test/berlin-demo', '[TEST] Demo competition. Diamond League meeting — travel and visas handled by the agency.', 'Rosella'),

    ('demo-comp-4', uid, '[TEST] Roma Cross Challenge', 'ROM', 'Roma', 'ITA', c4d, c4d, 'Cross', 'tier-3', 'completed', 2, 2,
      '["Cross"]'::jsonb, '{"gold":0,"silver":0,"bronze":0,"points":9}'::jsonb, 'cross', 'National', 'demo-org-1',
      'Rossi', 'Marco', '+39 02 1111 1111', 'demo.organizer1@example.test',
      ('[{"discipline":"Cross","gender":"W","date":"' || c4d || '"},{"discipline":"Cross","gender":"M","date":"' || c4d || '"}]')::jsonb,
      'https://example.test/roma-demo', '[TEST] Demo competition. Winter cross-country opener, 8 km loop.', 'Hounda'),

    ('demo-comp-5', uid, '[TEST] Firenze 10 Km Road Race', 'FIR', 'Firenze', 'ITA', c5d, c5d, 'Road', 'tier-2', 'live', 3, 0,
      '["10 Km"]'::jsonb, NULL, 'road', 'Label', 'demo-org-1',
      'Rossi', 'Marco', '+39 02 1111 1111', 'demo.organizer1@example.test',
      ('[{"discipline":"10 Km","gender":"W","date":"' || c5d || '"},{"discipline":"10 Km","gender":"M","date":"' || c5d || '"}]')::jsonb,
      'https://example.test/firenze-demo', '[TEST] Demo competition. RUNNING TODAY — results to be entered this evening.', 'Rosella'),

    ('demo-comp-6', uid, '[TEST] Torino Indoor Meeting', 'TOR', 'Torino', 'ITA', c6d, c6d, 'Indoor', 'tier-2', 'upcoming', 2, 0,
      '["1500 m","3000 m"]'::jsonb, NULL, 'indoor', 'National', 'demo-org-2',
      'Schmidt', 'Anna', '+49 30 2222 2222', 'demo.organizer2@example.test',
      ('[{"discipline":"1500 m","gender":"W","date":"' || c6d || '","indoor":true},{"discipline":"3000 m","gender":"W","date":"' || c6d || '","indoor":true,"toConfirm":true}]')::jsonb,
      'https://example.test/torino-demo', '[TEST] Demo competition. Indoor season opener — entries close one week before.', 'Hounda'),

    ('demo-comp-7', uid, '[TEST] Boston Spring Marathon', 'BOS', 'Boston', 'USA', c7d, c7d, 'Road', 'tier-1', 'upcoming', 3, 0,
      '["Marathon"]'::jsonb, NULL, 'marathon', 'Gold', 'demo-org-3',
      'Garcia', 'Pablo', '+34 96 333 3333', 'demo.organizer3@example.test',
      ('[{"discipline":"Marathon","gender":"W","date":"' || c7d || '"},{"discipline":"Marathon","gender":"M","date":"' || c7d || '"}]')::jsonb,
      'https://example.test/boston-demo', '[TEST] Demo competition. US visas required — start the applications three months out.', 'Rosella'),

    ('demo-comp-8', uid, '[TEST] Osaka Marathon', 'OSA', 'Osaka', 'JPN', c8d, c8d, 'Road', 'tier-1', 'upcoming', 2, 0,
      '["Marathon"]'::jsonb, NULL, 'marathon', 'Gold', 'demo-org-3',
      'Garcia', 'Pablo', '+34 96 333 3333', 'demo.organizer3@example.test',
      ('[{"discipline":"Marathon","gender":"W","date":"' || c8d || '"}]')::jsonb,
      'https://example.test/osaka-demo', '[TEST] Demo competition. Next season target — invitation still to be confirmed.', 'Rosella');

  -- =======================================================================
  -- ENTRIES — past ones carry results (they feed the rank graph, the history
  -- tab and the personal bests); future ones show the whole entry pipeline
  -- (proposed → waiting → accepted → ok). Every athlete has something coming.
  -- =======================================================================
  insert into public.race_entries (id, user_id, competition_id, athlete_id, discipline, gender, status, position, time, wind, note) values
    -- Valencia Marathon (past)
    ('demo-ent-01', uid, 'demo-comp-1', 'demo-ath-1', 'Marathon',      'W', 'ok', 2, '2h21''40"', '', '[TEST] Personal best.'),
    ('demo-ent-02', uid, 'demo-comp-1', 'demo-ath-5', 'Marathon',      'W', 'ok', 5, '2h24''55"', '', '[TEST] Season best.'),
    ('demo-ent-03', uid, 'demo-comp-1', 'demo-ath-4', 'Marathon',      'M', 'ok', 9, '2h11''30"', '', '[TEST] Debut over the distance.'),
    -- Milano Half (past)
    ('demo-ent-04', uid, 'demo-comp-2', 'demo-ath-1', 'Half Marathon', 'W', 'ok', 1, '1h07''12"', '', '[TEST] Course record.'),
    ('demo-ent-05', uid, 'demo-comp-2', 'demo-ath-5', 'Half Marathon', 'W', 'ok', 3, '1h08''40"', '', ''),
    ('demo-ent-06', uid, 'demo-comp-2', 'demo-ath-4', 'Half Marathon', 'M', 'ok', 4, '1h02''15"', '', '[TEST] Personal best.'),
    -- Berlin Meeting (past)
    ('demo-ent-07', uid, 'demo-comp-3', 'demo-ath-3', '1500 m',        'W', 'ok', 3, '4:02.35',  '+0.4', '[TEST] Personal best.'),
    ('demo-ent-08', uid, 'demo-comp-3', 'demo-ath-3', '800 m',         'W', 'ok', 5, '2:01.88',  '-0.2', ''),
    ('demo-ent-09', uid, 'demo-comp-3', 'demo-ath-2', '5000 m',        'M', 'ok', 2, '13:05.44', '', '[TEST] Personal best.'),
    ('demo-ent-10', uid, 'demo-comp-3', 'demo-ath-6', '5000 m',        'W', 'ok', 7, '15:22.10', '', ''),
    -- Roma Cross (past)
    ('demo-ent-11', uid, 'demo-comp-4', 'demo-ath-6', 'Cross',         'W', 'ok', 4, '26''40"', '', '[TEST] Last race before maternity leave.'),
    ('demo-ent-12', uid, 'demo-comp-4', 'demo-ath-2', 'Cross',         'M', 'ok', 6, '24''18"', '', ''),
    -- Firenze 10 Km (TODAY, live — no results yet)
    ('demo-ent-13', uid, 'demo-comp-5', 'demo-ath-1', '10 Km',         'W', 'ok',       NULL, NULL, '', '[TEST] Bib collected.'),
    ('demo-ent-14', uid, 'demo-comp-5', 'demo-ath-2', '10 Km',         'M', 'ok',       NULL, NULL, '', '[TEST] Bib collected.'),
    ('demo-ent-15', uid, 'demo-comp-5', 'demo-ath-4', '10 Km',         'M', 'accepted', NULL, NULL, '', '[TEST] Fitness test after injury.'),
    -- Torino Indoor (in 12 days)
    ('demo-ent-16', uid, 'demo-comp-6', 'demo-ath-3', '1500 m',        'W', 'accepted', NULL, NULL, '', '[TEST] Entry confirmed by the organiser.'),
    ('demo-ent-17', uid, 'demo-comp-6', 'demo-ath-6', '3000 m',        'W', 'waiting',  NULL, NULL, '', '[TEST] On the waiting list.'),
    -- Boston (in ~3 months)
    ('demo-ent-18', uid, 'demo-comp-7', 'demo-ath-1', 'Marathon',      'W', 'accepted', NULL, NULL, '', '[TEST] Elite field, contract signed.'),
    ('demo-ent-19', uid, 'demo-comp-7', 'demo-ath-5', 'Marathon',      'W', 'proposed', NULL, NULL, '', '[TEST] Proposed to the organiser.'),
    ('demo-ent-20', uid, 'demo-comp-7', 'demo-ath-4', 'Marathon',      'M', 'waiting',  NULL, NULL, '', '[TEST] Subject to medical clearance.'),
    -- Osaka (next year)
    ('demo-ent-21', uid, 'demo-comp-8', 'demo-ath-1', 'Marathon',      'W', 'proposed', NULL, NULL, '', '[TEST] Next-season target.'),
    ('demo-ent-22', uid, 'demo-comp-8', 'demo-ath-5', 'Marathon',      'W', 'proposed', NULL, NULL, '', '[TEST] Next-season target.');

  -- =======================================================================
  -- PASSPORTS — one per athlete. Expiry dates are spread deliberately: one
  -- already expired and two expiring soon, so the alerts and the bell have
  -- something real to report.
  -- =======================================================================
  insert into public.passports (id, user_id, athlete_id, number, nation, issued, expiry, note) values
    ('demo-pas-1', uid, 'demo-ath-1', '[TEST] EP1234567', 'Ethiopia', to_char(d0 - 1600, 'YYYY-MM-DD'), to_char(d0 +  38, 'YYYY-MM-DD'), '[TEST] Renewal appointment booked at the embassy.'),
    ('demo-pas-2', uid, 'demo-ath-2', '[TEST] EP7654321', 'Ethiopia', to_char(d0 - 1200, 'YYYY-MM-DD'), to_char(d0 + 420, 'YYYY-MM-DD'), ''),
    ('demo-pas-3', uid, 'demo-ath-3', '[TEST] YA9988776', 'Italy',    to_char(d0 -  800, 'YYYY-MM-DD'), to_char(d0 + 900, 'YYYY-MM-DD'), ''),
    ('demo-pas-4', uid, 'demo-ath-4', '[TEST] YA1122334', 'Italy',    to_char(d0 - 3600, 'YYYY-MM-DD'), to_char(d0 -  15, 'YYYY-MM-DD'), '[TEST] EXPIRED — renewal to be started.'),
    ('demo-pas-5', uid, 'demo-ath-5', '[TEST] KE4455667', 'Kenya',    to_char(d0 - 1900, 'YYYY-MM-DD'), to_char(d0 +  75, 'YYYY-MM-DD'), '[TEST] Expires before the spring marathon.'),
    ('demo-pas-6', uid, 'demo-ath-6', '[TEST] YA5566778', 'Italy',    to_char(d0 -  400, 'YYYY-MM-DD'), to_char(d0 +1200, 'YYYY-MM-DD'), '');

  -- =======================================================================
  -- VISAS — every kind, and every state of the workflow.
  -- =======================================================================
  insert into public.visas (id, user_id, athlete_id, kind, number, type, event, valid_from, valid_to, not_known, embassy, sent_to_federation, sent_to_agent, appointment, archived, note) values
    ('demo-vis-1', uid, 'demo-ath-1', 'Schengen', '[TEST] SCH-0001', 'Schengen M90',  'Road',         to_char(d0 - 60, 'YYYY-MM-DD'), to_char(d0 + 120, 'YYYY-MM-DD'), false, 'Italiana',  true,  false, NULL,                              false, '[TEST] Multiple entry, 90 days.'),
    ('demo-vis-2', uid, 'demo-ath-2', 'UK',       '[TEST] UK-0002',  'UK M180',       'Meeting',      to_char(d0 - 200,'YYYY-MM-DD'), to_char(d0 +  30, 'YYYY-MM-DD'), false, 'Britannica', true,  true,  NULL,                              false, '[TEST] Expires soon — renew before the indoor tour.'),
    ('demo-vis-3', uid, 'demo-ath-5', 'US',       '[TEST] US-0003',  'US P1',         'Road',         to_char(d0 - 300,'YYYY-MM-DD'), to_char(d0 + 700, 'YYYY-MM-DD'), false, 'Americana',  false, true,  NULL,                              false, '[TEST] Athlete visa for the US road circuit.'),
    ('demo-vis-4', uid, 'demo-ath-4', 'Schengen', '[TEST] SCH-0004', 'Schengen single','Road / Cross', '',                             '',                              true,  'Italiana',   false, false, to_char(d0 + 9, 'YYYY-MM-DD'),     false, '[TEST] Dates not known yet — embassy appointment booked.'),
    ('demo-vis-5', uid, 'demo-ath-3', 'US',       '[TEST] US-0005',  'US B1/B2',      'Meeting',      to_char(d0 - 120,'YYYY-MM-DD'), to_char(d0 + 900, 'YYYY-MM-DD'), false, 'Americana',  true,  false, NULL,                              false, ''),
    ('demo-vis-6', uid, 'demo-ath-6', 'Other',    '[TEST] OTH-0006', 'Japan single',  'Road',         to_char(d0 - 800,'YYYY-MM-DD'), to_char(d0 - 400, 'YYYY-MM-DD'), false, 'Giapponese', true,  true,  NULL,                              true,  '[TEST] Archived — trip did not go ahead.');

  -- =======================================================================
  -- CALENDAR — the current month filled with the two kinds of entry the
  -- calendar tracks: competitions and meetings. Competition entries link back
  -- to the competition they belong to, so clicking one opens its page.
  -- =======================================================================
  insert into public.calendar_events (id, user_id, title, category, date, start_hour, duration, athletes, location, competition_id) values
    ('demo-cal-01', uid, '[TEST] Organiser call — Firenze start list',  'meeting',     to_char(d0 -  6, 'YYYY-MM-DD'),  9,   1,   '["demo-ath-1","demo-ath-2"]'::jsonb, '[TEST] Video call', NULL),
    ('demo-cal-02', uid, '[TEST] Contract review — Aster Bekele',       'meeting',     to_char(d0 -  3, 'YYYY-MM-DD'), 11,   1.5, '["demo-ath-1"]'::jsonb, '[TEST] Agency office, Milano', NULL),
    ('demo-cal-03', uid, '[TEST] Team meeting — spring plan',           'meeting',     to_char(d0 -  2, 'YYYY-MM-DD'), 15,   1,   '["demo-ath-1","demo-ath-2","demo-ath-3"]'::jsonb, '[TEST] Agency office, Milano', NULL),
    ('demo-cal-04', uid, '[TEST] Pre-race briefing — Firenze',          'meeting',     to_char(d0 -  1, 'YYYY-MM-DD'), 18,   1,   '["demo-ath-1","demo-ath-2","demo-ath-4"]'::jsonb, '[TEST] Hotel Demo, Firenze', NULL),
    ('demo-cal-05', uid, '[TEST] Firenze 10 Km Road Race',              'competition', c5d,                             10,   2,   '["demo-ath-1","demo-ath-2","demo-ath-4"]'::jsonb, '[TEST] Firenze, ITA', 'demo-comp-5'),
    ('demo-cal-06', uid, '[TEST] Results debrief — Firenze',            'meeting',     to_char(d0 +  1, 'YYYY-MM-DD'), 17,   1,   '["demo-ath-1","demo-ath-2","demo-ath-4"]'::jsonb, '[TEST] Video call', NULL),
    ('demo-cal-07', uid, '[TEST] Medical review — Marco Greco',         'meeting',     to_char(d0 +  2, 'YYYY-MM-DD'),  8,   1,   '["demo-ath-4"]'::jsonb, '[TEST] Clinica Demo, Firenze', NULL),
    ('demo-cal-08', uid, '[TEST] Sponsor call — kit for next season',   'meeting',     to_char(d0 +  4, 'YYYY-MM-DD'), 11,   1,   '["demo-ath-1"]'::jsonb, '[TEST] Video call', NULL),
    ('demo-cal-09', uid, '[TEST] Entry deadline — Torino Indoor',       'meeting',     to_char(d0 +  5, 'YYYY-MM-DD'),  9,   1,   '["demo-ath-3","demo-ath-6"]'::jsonb, '[TEST] Agency office, Milano', 'demo-comp-6'),
    ('demo-cal-10', uid, '[TEST] Visa appointment — Marco Greco',       'meeting',     to_char(d0 +  9, 'YYYY-MM-DD'), 14,   2,   '["demo-ath-4"]'::jsonb, '[TEST] Embassy, Roma', NULL),
    ('demo-cal-11', uid, '[TEST] Torino Indoor Meeting',                'competition', c6d,                             16,   3,   '["demo-ath-3","demo-ath-6"]'::jsonb, '[TEST] Torino, ITA', 'demo-comp-6'),
    ('demo-cal-12', uid, '[TEST] Anti-doping whereabouts review',       'meeting',     to_char(d0 + 14, 'YYYY-MM-DD'), 10,   1,   '["demo-ath-1","demo-ath-2","demo-ath-5"]'::jsonb, '[TEST] Agency office, Milano', NULL),
    ('demo-cal-13', uid, '[TEST] Boston Spring Marathon',               'competition', c7d,                              9,   4,   '["demo-ath-1","demo-ath-5","demo-ath-4"]'::jsonb, '[TEST] Boston, USA', 'demo-comp-7');

  -- =======================================================================
  -- DOCUMENTS — every category, every file type. Passports, visas and
  -- contracts carry an expiry so the Documents date filter has real data
  -- (valid / expiring soon / expired, and contract deadlines).
  -- =======================================================================
  insert into public.documents (id, user_id, name, type, category, size, athlete_id, uploaded, expires, icon) values
    ('demo-doc-01', uid, '[TEST] Passport scan — Aster Bekele.pdf',           'pdf',   'passport', '1.4 MB', 'demo-ath-1', to_char(d0 - 200, 'YYYY-MM-DD'), to_char(d0 +  38, 'YYYY-MM-DD'), 'globe'),
    ('demo-doc-02', uid, '[TEST] Passport scan — Marco Greco.pdf',            'pdf',   'passport', '1.1 MB', 'demo-ath-4', to_char(d0 - 900, 'YYYY-MM-DD'), to_char(d0 -  15, 'YYYY-MM-DD'), 'globe'),
    ('demo-doc-03', uid, '[TEST] Passport scan — Naomi Kiptoo.pdf',           'pdf',   'passport', '1.6 MB', 'demo-ath-5', to_char(d0 - 300, 'YYYY-MM-DD'), to_char(d0 +  75, 'YYYY-MM-DD'), 'globe'),
    ('demo-doc-04', uid, '[TEST] Visa Schengen M90 — Aster Bekele.pdf',       'pdf',   'visa',     '820 KB', 'demo-ath-1', to_char(d0 -  60, 'YYYY-MM-DD'), to_char(d0 + 120, 'YYYY-MM-DD'), 'flag'),
    ('demo-doc-05', uid, '[TEST] Visa UK M180 — Yonas Tadesse.pdf',           'pdf',   'visa',     '760 KB', 'demo-ath-2', to_char(d0 - 200, 'YYYY-MM-DD'), to_char(d0 +  30, 'YYYY-MM-DD'), 'flag'),
    ('demo-doc-06', uid, '[TEST] Visa US P1 — Naomi Kiptoo.pdf',              'pdf',   'visa',     '910 KB', 'demo-ath-5', to_char(d0 - 300, 'YYYY-MM-DD'), to_char(d0 + 700, 'YYYY-MM-DD'), 'flag'),
    ('demo-doc-07', uid, '[TEST] Medical certificate — Aster Bekele.pdf',     'pdf',   'medical',  '480 KB', 'demo-ath-1', to_char(d0 -  40, 'YYYY-MM-DD'), NULL, 'shield'),
    ('demo-doc-08', uid, '[TEST] MRI report calf — Marco Greco.pdf',          'pdf',   'medical',  '2.3 MB', 'demo-ath-4', to_char(d0 -  25, 'YYYY-MM-DD'), NULL, 'shield'),
    ('demo-doc-09', uid, '[TEST] Blood test panel — Yonas Tadesse.pdf',       'pdf',   'medical',  '350 KB', 'demo-ath-2', to_char(d0 -  12, 'YYYY-MM-DD'), NULL, 'shield'),
    ('demo-doc-10', uid, '[TEST] Sponsorship contract — Aster Bekele.doc',    'doc',   'contract', '240 KB', 'demo-ath-1', to_char(d0 - 380, 'YYYY-MM-DD'), to_char(d0 +  45, 'YYYY-MM-DD'), 'fileText'),
    ('demo-doc-11', uid, '[TEST] Management agreement — Naomi Kiptoo.doc',    'doc',   'contract', '190 KB', 'demo-ath-5', to_char(d0 - 700, 'YYYY-MM-DD'), to_char(d0 -   5, 'YYYY-MM-DD'), 'fileText'),
    ('demo-doc-12', uid, '[TEST] Appearance agreement — Boston.doc',          'doc',   'contract', '210 KB', 'demo-ath-1', to_char(d0 -  20, 'YYYY-MM-DD'), to_char(d0 + 200, 'YYYY-MM-DD'), 'fileText'),
    ('demo-doc-13', uid, '[TEST] Finish photo — Milano Half.jpg',             'image', 'media',    '3.1 MB', 'demo-ath-1', to_char(d0 - 118, 'YYYY-MM-DD'), NULL, 'image'),
    ('demo-doc-14', uid, '[TEST] Team photo — Berlin Meeting.jpg',            'image', 'media',    '4.5 MB', NULL,         to_char(d0 -  44, 'YYYY-MM-DD'), NULL, 'image'),
    ('demo-doc-15', uid, '[TEST] Press release — season launch.pdf',          'pdf',   'media',    '620 KB', NULL,         to_char(d0 -   8, 'YYYY-MM-DD'), NULL, 'fileText');

  raise notice 'Demo data loaded: 3 organizers, 6 athletes, 8 competitions, 22 entries, 6 passports, 6 visas, 13 calendar events, 15 documents.';
end $$;

-- ---- Verify ---------------------------------------------------------------
select 'athletes' as table_name, count(*) from public.athletes where id like 'demo-%'
union all select 'organizers',      count(*) from public.organizers      where id like 'demo-%'
union all select 'competitions',    count(*) from public.competitions    where id like 'demo-%'
union all select 'race_entries',    count(*) from public.race_entries    where id like 'demo-%'
union all select 'visas',           count(*) from public.visas           where id like 'demo-%'
union all select 'passports',       count(*) from public.passports       where id like 'demo-%'
union all select 'calendar_events', count(*) from public.calendar_events where id like 'demo-%'
union all select 'documents',       count(*) from public.documents       where id like 'demo-%';
