-- Step 1: Create the table
CREATE TABLE IF NOT EXISTS big_push_projects (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title               text NOT NULL,
  contractor          text,
  contract_sum        text,
  start_date          text,
  exp_completion_date text,
  current_progress    text,
  agency              text,
  region              text,
  source_url          text,
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE big_push_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read big_push_projects" ON big_push_projects;
DROP POLICY IF EXISTS "Service role full access big_push_projects" ON big_push_projects;

CREATE POLICY "Authenticated users can read big_push_projects"
  ON big_push_projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role full access big_push_projects"
  ON big_push_projects FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Step 2: Clear existing data and re-seed
TRUNCATE big_push_projects;

-- Step 3: Insert all 76 Big Push projects
INSERT INTO big_push_projects (title, contractor, contract_sum, start_date, exp_completion_date, current_progress, agency, region) VALUES

-- Ahafo
('Upgrading of Bediako Junction - Camp 15 - Sefwi Adabokrom (9.5km) - Lot 2', 'Kingspok Construction Limited', 'GHS135,594,474.05', '15th Sep 2025', NULL, 'Ongoing', 'GHA', 'Ahafo'),
('Rehabilitation of Tepa (Mabang) - Goaso Road (39.0km)', 'Kofi Job Company Limited', 'GHS554,679,293.69', '12th Oct 2025', NULL, 'Ongoing', 'GHA', 'Ahafo'),

-- Ashanti
('Construction Of Kumasi Outer Ring Road Project (15km) - Lot 1', 'Arab Contractors Ghana Limited', 'GHS1,029,969,450.51', '25th Nov 2025', NULL, 'Ongoing', 'DUR', 'Ashanti'),
('Construction Of Kumasi Outer Ring Road Project (15km) - Lot 2', 'Arab Contractors Ghana Limited', 'GHS1,029,969,450.51', '31st Dec 2025', NULL, 'Ongoing', 'DUR', 'Ashanti'),
('Construction Of Kumasi Outer Ring Road Project (15km) - Lot 3', 'Arab Contractors Ghana Limited', 'GHS1,031,413,200.51', '24th Nov 2025', NULL, 'Ongoing', 'DUR', 'Ashanti'),
('Design and Construction of Suame Interchange and Ancillary Works Component – Phase 1', 'Rango Construction Company Limited', 'GHS40,000,000', '26th Oct 2025', NULL, 'Ongoing', 'DUR', 'Ashanti'),
('Design and Construction of Suame Interchange- Local Roads Component - Phase 2', 'Rango Construction Company Limited', 'GHS140,000,000', '25th Oct 2025', NULL, 'Ongoing', 'DUR', 'Ashanti'),

-- Bono
('Construction of Sunyani Outer Ring Road (17km) - Lot 1', 'Kofi Job Company Limited', 'GHS995,611,392.11', '24th Nov 2025', NULL, '10%', 'DUR', 'Bono'),
('Construction of Sunyani Outer Ring Road (17km) - Lot 2', 'Kofi Job Company Limited', 'GHS997,973,892.11', '24th Nov 2025', NULL, '10%', 'DUR', 'Bono'),
('Reconstruction of Jinijini - Sampa Road Project (80km)', 'Rango Construction Company Limited', 'GHS1,658,985,244.53', '12th Nov 2025', NULL, '20%', 'GHA', 'Bono'),

-- Bono East
('Rehabilitation of Techiman - Nkonsia - Wenchi Road (32.6km)', 'Volta Impex', 'GHS1,186,772,075.23', '29th Nov 2024', NULL, 'Ongoing', 'GHA', 'Bono East'),

-- Bono/Savana
('Rehabilitation of Wenchi- Sawla Road (Km 0+000 – Km 25+000)', 'CIWE Ghana Engineering Limited', 'GHS475,345,120.73', '12th Nov 2025', NULL, 'Ongoing', 'GHA', 'Bono/Savana'),
('Rehabilitation of Wenchi- Sawla Road (Km 25+000 - Km 50+000)', 'CIWE Ghana Engineering Limited', 'GHS475,345,120.73', '18th Sept 2025', NULL, 'Ongoing', 'GHA', 'Bono/Savanna'),

-- Central
('Construction of Interchange at Winneba Roundabout (Km 28+200); 10 No. Footbridges; And Dualization into Winneba and Swedru Towns (4.0km)', 'Mo & Mo Company Limited', 'GHS1,117,001,494.70', NULL, NULL, 'Ongoing', 'GHA', 'Central'),
('Dualisation of Cape Coast- Takoradi Road (114 - 139km)', 'S&L Construction and Engineering', 'GHS3,104,632,933.00', '29th Sept 2025', NULL, 'Ongoing', 'GHA', 'Central'),
('Dualisation of Winneba - Cape Coast Road (30 - 54 Km)', 'M.A & Constant Company', 'GHS1,878,011,148.00', NULL, 'Dec 2027', '25%', 'GHA', 'Central'),
('Dualisation of Winneba - Cape Coast Road (54 - 79 Km)', 'M.A & Constant Company', 'GHS3,860,486,565.00', '29th Sept 2025', NULL, 'Ongoing', 'GHA', 'Central'),
('Rehabilitation and Upgrading of Kasoa – Akoti Road (Km 0+000 – Km 12+000)', 'NAG Fairmount Company Limited', 'GHS91,461,600', '22nd Dec 2023', NULL, 'Ongoing', 'GHA', 'Central'),
('Rehabilitation and Upgrading of Kasoa – Winneba Road (30.0km) - Lot 1A: Construction of Interchanges at Sapato (Km 1+800), Buduburam (Km 3+200) Awutu Breku (Km 7+200), Akoti (Km 9+800) and 2No. Footbridges', 'NAG Fairmount Company Limited', 'GHS75,480,955.89', '22nd Dec 2023', NULL, 'Ongoing', 'GHA', 'Central'),
('Rehabilitation and Upgrading of Kasoa – Winneba Road (30.Km) - Lot 2: Rehabilitation and Upgrading of Akoti Junction - Winneba Roundabout (Km 12.00 - 30.00)', 'MM Delovely Company Limited', 'GHS85,237,300', '22nd Dec 2023', NULL, 'Ongoing', 'GHA', 'Central'),
('Rehabilitation and Upgrading of Kasoa – Winneba Road (30.Km) - Lot 2A: Construction of Interchanges at Km 15+900 (Onion Market); Km 18+900 (Potsin); Twin River Bridge at Km 22+900 (Okyereko); and 3No. Footbridges', 'MM Delovely Company Limited', 'GHS57,875,078.5', '22nd Dec 2023', NULL, 'Ongoing', 'GHA', 'Central'),
('Rehabilitation of Mankessim - Ajumako - Agona Swedru Road and Others Total Length = 111km', 'E – Speedway Construction Limited', 'GHS2,890,514,550.00', '30th Dec 2025', NULL, 'Ongoing', 'GHA', 'Central'),

-- Eastern
('Construction of Adawso Bridge', 'SCL Sonitra Construction Limited', 'GHS497,664,217.34', '30th Dec 2025', NULL, '10%', 'GHA', 'Eastern'),
('Upgrading of Akosombo-Gyakiti-Kudikope Feeder Road (KM 8+000 - 31 + 600) and Yeniama Junction -Sedorm Feeder Road (8.40km)', 'Mmanab Company Limited', 'GHS333,147,194.00', NULL, 'Nov 2027', '15%', 'DFR', 'Eastern'),
('Upgrading of Apeguso - Mpakadan Feeder Road (9.00Km)', 'Build Managers Limited', 'GHS145,220,449.36', NULL, NULL, 'Ongoing', 'DFR', 'Eastern'),

-- Eastern/Volta
('Rehabilitation of Atimpoku - Asikuma Junction (0-17.5km)', 'Ussuya (Gh) Limited', 'GHS433,745,286.43', '18th Sep 2025', NULL, 'Ongoing', 'GHA', 'Eastern/Volta'),

-- Greater Accra
('Reconstruction of Dodowa - Afienya-Dawhenya Road (0-24.80km) & Selected Town Roads 3.0km', 'Oswal Investments Limited', 'GHS1,116,976,732.05', '15th Sep 2025', '4th December 2027', '35%', 'GHA', 'Greater Accra'),
('Rehabilitation of Tema - Aflao Road (Km 1 - 18.30)', 'First Sky Limited', 'GHS1,477,093,226.79', '15th Sep 2025', 'Dec 2027', 'N/A', 'GHA', 'Greater Accra'),
('Upgrading Of Oyibi-Appolonia-Afienya Road (21.0km)', 'Proslet', 'GHS708,097,258.50', '17th Dec 2025', '5th Jan 2028', '10%', 'GHA', 'Greater Accra'),

-- Greater Accra / Eastern
('Design Build for the Dualization of Adenta Dodowa Road (R40) - 22km', 'Oswal Investments Limited', 'GHS1,548,374,605.41', '22nd Mar 2024', NULL, 'Ongoing', 'GHA', 'Greater Accra / Eastern'),
('Rehabilitation of Ofankor – Nsawam Road (Dual Carriageway) 33.0km', 'Maripoma Enterprise Limited', 'GHS346,479,013.79', '23rd May 2022', NULL, '70%', 'GHA', 'Greater Accra / Eastern'),

-- North East
('Rehabilitation of Gbintri - Nakpanduri Road (44km)', 'Mawums Limited', 'GHS1,038,241,891.20', '18th Sep 2025', NULL, 'Ongoing', 'GHA', 'North East'),

-- Northern
('Construction of 3rd Ring Road, Tamale -Ph. 1 (11km) – Lot 1', 'Sinohydro Corporation Limited', 'GHS873,575,035.81', '22nd Jan 2026', NULL, '10%', 'DUR', 'Northern'),
('Construction of 3rd Ring Road, Tamale -Ph. 1 (11km) - Lot 2', 'China Railway No. 5 Engineering Group Limited', 'GHS873,575,035.81', '22nd Jan 2026', NULL, '10%', 'DUR', 'Northern'),
('Construction of 3rd Ring Road, Tamale -Ph. 1 (11km) - Lot 3', 'Munisco Limited', 'GHS875,018,805.82', '22nd Jan 2026', NULL, '10%', 'DUR', 'Northern'),

-- Oti
('Construction of Dambai Bridge', 'Maripoma Enterprise Limited', 'GHS3,989,560,929.14', '29th Sep 2025', NULL, '10%', 'GHA', 'Oti'),
('Rehabilitation of Dodo Pepesu – Nkwanta (46.40km)', 'Groth 82 Global Ltd.', 'GHS683,902,957.69', '31st Dec 2025', NULL, 'Ongoing', 'GHA', 'Oti'),
('Upgrading of Nkwanta - Oti Damanko (0- 50.3km)', 'China Jiangxi Engineering Ghana Limited', 'GHS780,178,476.09', '12th Dec 2025', NULL, 'Ongoing', 'GHA', 'Oti'),
('Upgrading of Nkwanta - Oti Damanko (50.3km - 62km)', 'China Jiangxi Engineering Ghana Limited', 'GHS225,221,769.02', '12th Dec 2025', NULL, 'Ongoing', 'GHA', 'Oti'),

-- Savana
('Rehabilitation of Wenchi - Sawla (Km 100+000 - 125+000) Including Tinga Town Roads (3km)', 'China Railway No. 5 Engineering Group Limited', 'GHS492,409,859.94', '18th Sep 2025', NULL, 'Ongoing', 'GHA', 'Savana'),
('Rehabilitation of Wenchi - Sawla (Km 125+000 - 150+000)', 'China Railway No. 5 Engineering Group Limited', 'GHS448,383,080.79', '18th Sep 2025', NULL, 'Ongoing', 'GHA', 'Savana'),
('Rehabilitation of Wenchi - Sawla (Km 150+000 - 195+000) and Others (7km)', 'Maripoma Enterprise Limited', 'GHS861,858,834.26', '18th Sep 2025', NULL, 'Ongoing', 'GHA', 'Savana'),
('Rehabilitation of Wenchi- Sawla Road (Km 50+000 - Km 75+000)', 'Polychanda Oversea Engineering Company Limited', 'GHS423,613,808.58', '29th Sep 2025', NULL, 'Ongoing', 'GHA', 'Savana'),
('Rehabilitation of Wenchi-Sawla Road (Km 75+000 - Km 100+000) Including Bamboi (3km) And Banda Nkwanta (2km) Town Roads', 'Polychanda Oversea Engineering Company Limited', 'GHS486,405,201.68', '29th Sep 2025', NULL, 'Ongoing', 'GHA', 'Savana'),

-- Upper East
('Partial Reconstruction of Navrongo - Tumu Road (27km)', 'Medmo Company Limited', 'GHS360,107,867.58', '11th Dec 2025', NULL, 'Ongoing', 'GHA', 'Upper East'),
('Upgrading of Tumu - Chuchuliga - Navrongo (km 15-47) including construction of 36m span reinforced concrete bridge over Kanyibie River and 24m span reinforced concrete bridge over bechelihu river. - 32.6km', 'Mawums Limited', 'GHS598,002,009.04', NULL, NULL, 'Ongoing', 'GHA', 'Upper East'),
('Upgrading of Tumu - Sissili - Navrongo Road (Km 0 - 15)', 'Mawums Limited', 'GHS254,180,205.58', NULL, NULL, 'Ongoing', 'GHA', 'Upper East'),

-- Upper West
('Construction of National Route N18 - Wa - Han Road (Km 54 - 76)', 'P&W Ghanem Limited', 'GHS159,447,053.75', '11th Dec 2025', NULL, 'Ongoing', 'GHA', 'Upper West'),
('Rehabilitation of Wa - Han Road (Km 0 - 54)', 'Mo & Mo Company Limited', 'GHS436,384,865.23', '17th Dec 2025', NULL, 'Ongoing', 'GHA', 'Upper West'),
('Upgrading of Bediako Junction - Camp 15 - Sefwi Adabokrom (55km) - Lot 1', 'Mawums Company Ltd', 'GHS12,000,000.00', '5th Jan 2025', NULL, 'Ongoing', 'GHA', 'Upper West'),
('Upgrading of Tumu - Hamile Road (Km 40.00 - 55.00)', 'M.A & Constant Company', 'GHS207,969,054.78', '17th Dec 2025', NULL, 'Ongoing', 'GHA', 'Upper West'),
('Upgrading of Tumu - Han - Lawra Road (Km 0 - 10)', 'Ghanhali Company Limited', 'GHS207,969,054.78', '17th Dec 2025', NULL, 'Ongoing', 'GHA', 'Upper West'),
('Upgrading of Tumu - Han - Lawra Road (Km 0 - 10)', 'Ashcal Limited', 'GHS159,449,928.43', '11th Dec 2025', NULL, 'Ongoing', 'GHA', 'Upper West'),
('Upgrading of Tumu - Han - Lawra Road (Km 10 - 30)', 'Maripoma Enterprise Limited', 'GHS90,639,575.32', '11th Dec 2025', NULL, 'Ongoing', 'GHA', 'Upper West'),
('Upgrading of Tumu - Han - Lawra Road (Km 30 - 45)', 'Greenhouse Int. Development Gh. Ltd.', 'GHS173,233,182.94', '11th Dec 2025', NULL, 'Ongoing', 'GHA', 'Upper West'),
('Upgrading of Tumu - Han - Lawra Road (Km 45 - 70)', 'P&W Ghanem Limited', 'GHS421,701,612.50', '11th Dec 2025', NULL, 'Ongoing', 'GHA', 'Upper West'),

-- Volta
('Reconstruction of Anyirawasi – Ho Tritrinu (Km 49.4 – 70.0), Ho (Guinness Deport) – Ho Airport 2nd Gate (Km 0-7.7)', 'First Sky Limited', 'GHS1,525,609,304.00', '15th Sep 2025', NULL, 'Ongoing', 'GHA', 'Volta'),
('Reconstruction of Have - Hohoe Road (53km) (Completion of Outstanding Works) Including Critical Town and Access Roads (11.35km) and Construction of Alavanyo – Kpeme-Nkonya Tayi (Nkonsec) Road (3.6km) & Nkonya Ahenkro – Alavanyo Kpeme Road (2.8km) – Total Length = 70.75km', 'Greenhouse Int. Development Gh. Ltd.', 'GHS811,330,915.08', '12th Nov 2025', NULL, 'Ongoing', 'GHA', 'Volta'),
('Rehabilitation of Afiadenyigba - Penyi Road (Km 62.60 - Km 76.60) Including Internal Link Roads Within Dzodze and Penyi Township (3km)', 'Timeline & Innovations Company Ltd.', 'GHS367,904,784.34', '28th Nov 2025', NULL, 'Ongoing', 'GHA', 'Volta'),
('Rehabilitation of Afiadenyigba - Penyi Road (Km 76.60 - Km 85.0) Including Dualisation of Dzodze Town Road (3.5km)', 'Medmo Company Limited', 'GHS441,304,080.92', '12th Nov 2025', NULL, 'Ongoing', 'GHA', 'Volta'),
('Rehabilitation of Atimpoku - Asikuma - Ho - Denu - Aflao Road (177Km) Rehabilitation of Asikuma Junction - Anyirawasi (Km 26.0 - 49.4)', 'Ultra Nexus Limited', 'GHS634,061,351.78', '29th Sep 2025', NULL, 'Ongoing', 'GHA', 'Volta'),
('Rehabilitation of Atimpoku - Asikuma Junction (17.5km - 26Km)', 'Dwawill Limited', 'GHS210,843,969.63', '29th Sep 2025', NULL, 'Ongoing', 'GHA', 'Volta'),
('Rehabilitation of Ho - Kpetoe Road (Km 7.70 - Km 27.60)', 'China Railway No. 5 Engineering Group Limited', 'GHS976,398,063.10', '18th Sep 2025', NULL, 'Ongoing', 'GHA', 'Volta'),
('Rehabilitation of Hohoe - Jasikan 30km', 'Rolider Ghana Limited', 'GHS489,359,153.20', '12th Nov 2025', NULL, 'Ongoing', 'GHA', 'Volta'),
('Rehabilitation of Kpetoe - Aveafiadenyigba Road (Km 27+600 - Km 51+600) Including Ziope Towns Roads', 'Rolider Ghana Limited', 'GHS545,928,621.25', '18th Sep 2025', NULL, 'Ongoing', 'GHA', 'Volta'),
('Rehabilitation of Kpetoe - Aveafiadenyigba Road (Km 51+600 - Km 62+600) Including Ziope Towns Roads', 'Timeline & Innovations Company Ltd.', 'GHS250,302,362.02', '18th Sep 2025', NULL, 'Ongoing', 'GHA', 'Volta'),
('Rehabilitation of Penyi - Aflao (Km 85+000 - 107+000)', 'Medmo Company Limited', 'GHS537,999,204.14', '18th Sep 2025', NULL, 'Ongoing', 'GHA', 'Volta'),
('Upgrading of Todome - Toh Kpalime - Dzemeni Feeder Road and Dzemeni Town Road (24.07KM)', 'Sanam Ghana Limited', 'GHS300,291,294.94', '17th Sep 2025', NULL, 'Ongoing', 'DFR', 'Volta'),

-- Western
('Dualisation of Cape Coast- Takoradi Road (139- 164km)', 'Alkyro Jules Company Limited', 'GHS2,509,998,661.00', '29th Sep 2025', NULL, 'Ongoing', 'GHA', 'Western'),
('Dualisation of Cape Coast- Takoradi Road (164 - 187.6km)', 'S&L Construction and Engineering', 'GHS3,323,232,152.00', '25th Sep 2025', NULL, 'Ongoing', 'GHA', 'Western'),
('Takoradi - Agona Rehabilitation and Dualization of Takoradi – Agona Junction Road (23km) Including 2No. Dual Carriageway Bridges', 'Justmoh Construction Limited', 'GHS1,222,739,765.00', '15th Feb 2024', NULL, 'Ongoing', 'GHA', 'Western'),

-- Western North
('Construction of Dadieso - Akontombra Road (Km 4.0 - Km 26.30)', 'Kingspok Construction Limited', 'GHS816,744,717.14', '29th Sep 2025', NULL, '10%', 'GHA', 'Western North'),
('Construction of Enchi - Elubo Road (71.25 Km)', 'Top Engineering International Ltd.', 'GHS1,414,219,012.69', '29th Sep 2025', NULL, 'Ongoing', 'GHA', 'Western North'),
('Upgrading of Adwofua-Oseikojokrom Road Road (Km16-41)', 'Cymain Ghana Limited', 'GHS390,077,209.00', '18th Sep 2025', NULL, 'Ongoing', 'GHA', 'Western North'),
('Upgrading of Enchi - Kudjouru - Pekyi (Km 0.00 - Km30.00)', 'Maripoma Enterprise Limited', 'GHS410,236,050.39', '18th Sep 2025', NULL, 'Ongoing', 'GHA', 'Western North'),
('Upgrading of Enchi - Kudjouru - Pekyi (Km30.00 - Km 62.00)', 'Big Aidoo Construction Limited', 'GHS469,040,715.45', '18th Sep 2025', NULL, 'Ongoing', 'GHA', 'Western North');
