// Reemplaza estos valores por los de Supabase: Project Settings > API.
// Usa solo la anon key en el navegador. Nunca publiques la service_role key.
const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU_ANON_KEY_PUBLICA';

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
