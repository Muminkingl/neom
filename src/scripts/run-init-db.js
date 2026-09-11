#!/usr/bin/env node
// Direct DB init via Supabase REST SQL endpoint (no exec_sql RPC needed)
// Run: node src/scripts/run-init-db.js

const https = require('https');

const SUPABASE_URL = 'https://bgwcqokzcrrdfmdtvptb.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnd2Nxb2t6Y3JyZGZtZHR2cHRiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTA0MTM3NCwiZXhwIjoyMTA0NjE3Mzc0fQ.co4_gabBhqlFjfbwpIur4cu2ko0iy84rnGso_fUNMJU';

function sqlRequest(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const url = new URL('/rest/v1/sql', SUPABASE_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Length': Buffer.byteLength(body),
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true });
        } else {
          try {
            const parsed = JSON.parse(data);
            resolve({ ok: false, error: parsed.message || parsed.error || data });
          } catch {
            resolve({ ok: false, error: data });
          }
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const FULL_SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PATIENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.patients (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                 TEXT NOT NULL,
  dob                  TEXT DEFAULT '',
  hospital_file_number TEXT DEFAULT '',
  mobile_number        TEXT DEFAULT '',
  sex                  TEXT DEFAULT '',
  age_of_diagnosis     TEXT DEFAULT '',
  clinic_id            TEXT,
  diagnosis            TEXT DEFAULT '',
  treatment            TEXT DEFAULT '',
  current_treatment    TEXT DEFAULT '',
  response             TEXT DEFAULT '',
  note                 TEXT DEFAULT '',
  follow_up_date       TEXT DEFAULT '',
  table_data           TEXT DEFAULT '',
  image_url            TEXT DEFAULT '',
  imaging              TEXT DEFAULT '',
  ultrasound           TEXT DEFAULT '',
  lab_text             TEXT DEFAULT '',
  report               TEXT DEFAULT '',
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id              UUID
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own patients"    ON public.patients;
DROP POLICY IF EXISTS "Users can insert their own patients"  ON public.patients;
DROP POLICY IF EXISTS "Users can update their own patients"  ON public.patients;
DROP POLICY IF EXISTS "Users can delete their own patients"  ON public.patients;
DROP POLICY IF EXISTS "Admin can view all patients"          ON public.patients;
DROP POLICY IF EXISTS "Admin can insert patients"            ON public.patients;
DROP POLICY IF EXISTS "Admin can update all patients"        ON public.patients;
DROP POLICY IF EXISTS "Admin can delete all patients"        ON public.patients;

CREATE POLICY "Users can view their own patients"   ON public.patients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own patients" ON public.patients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own patients" ON public.patients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own patients" ON public.patients FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admin can view all patients"         ON public.patients FOR SELECT USING (user_id = '00000000-0000-0000-0000-000000000000');
CREATE POLICY "Admin can insert patients"           ON public.patients FOR INSERT WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000');
CREATE POLICY "Admin can update all patients"       ON public.patients FOR UPDATE USING (user_id = '00000000-0000-0000-0000-000000000000');
CREATE POLICY "Admin can delete all patients"       ON public.patients FOR DELETE USING (user_id = '00000000-0000-0000-0000-000000000000');

CREATE INDEX IF NOT EXISTS patients_user_id_idx ON public.patients (user_id);

-- ============================================================
-- VISITS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.visits (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id            UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  diagnosis             TEXT DEFAULT '',
  treatment             TEXT DEFAULT '',
  current_treatment     TEXT DEFAULT '',
  history               TEXT DEFAULT '',
  past_medical_history  TEXT DEFAULT '',
  drug_history          TEXT DEFAULT '',
  past_surgical_history TEXT DEFAULT '',
  examination           TEXT DEFAULT '',
  follow_up_date        TEXT DEFAULT '',
  note                  TEXT DEFAULT '',
  prescription          TEXT DEFAULT '',
  table_data            TEXT DEFAULT '',
  investigations        JSONB DEFAULT '[]'::jsonb,
  visited_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id               UUID DEFAULT '00000000-0000-0000-0000-000000000000'
);

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all visits access" ON public.visits;
CREATE POLICY "Allow all visits access" ON public.visits FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS visits_patient_id_idx    ON public.visits (patient_id);
CREATE INDEX IF NOT EXISTS visits_created_at_idx    ON public.visits (created_at);
CREATE INDEX IF NOT EXISTS visits_investigations_idx ON public.visits USING gin(investigations);

-- ============================================================
-- APPOINTMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_name         TEXT NOT NULL,
  phone_number         TEXT NOT NULL DEFAULT '',
  appointment_date     TEXT NOT NULL DEFAULT '',
  appointment_time     TEXT NOT NULL DEFAULT '',
  notes                TEXT DEFAULT '',
  status               TEXT NOT NULL DEFAULT 'Scheduled',
  gender               TEXT DEFAULT '',
  age                  TEXT DEFAULT '',
  converted_patient_id UUID DEFAULT NULL,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id              UUID DEFAULT '00000000-0000-0000-0000-000000000000'
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all appointments access" ON public.appointments;
CREATE POLICY "Allow all appointments access" ON public.appointments FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS appointments_user_id_idx ON public.appointments (user_id);
CREATE INDEX IF NOT EXISTS appointments_date_idx    ON public.appointments (appointment_date);

SELECT pg_notify('pgrst', 'reload schema');
`;

async function run() {
  console.log('\n🚀  NEOM Database Init — Running full SQL...\n');
  const result = await sqlRequest(FULL_SQL);
  if (result.ok) {
    console.log('✅  All tables created successfully!');
    console.log('🎉  Database is ready — patients, visits, appointments tables + RLS policies + indexes');
  } else {
    // The /rest/v1/sql endpoint might not exist in all Supabase tiers.
    // Fall back with helpful message.
    console.error('❌  REST SQL failed:', result.error);
    console.log('\n📋  FALLBACK: Copy src/scripts/init-fresh-db.sql into the Supabase SQL Editor and run it.');
    console.log('    URL: https://supabase.com/dashboard/project/bgwcqokzcrrdfmdtvptb/sql/new');
    process.exit(1);
  }
}

run();
