import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Copy .env.example → .env and fill in values.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Auth helpers ──────────────────────────────────────────────────────────────
export const signUp = (email, password, name, department, jobTitle) =>
  supabase.auth.signUp({
    email,
    password,
    options: { data: { name, department, job_title: jobTitle } },
  });

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password });

export const signOut = () => supabase.auth.signOut();

export const getSession = () => supabase.auth.getSession();

// ── Profile ───────────────────────────────────────────────────────────────────
export const getProfile = (id) =>
  supabase.from('profiles').select('*').eq('id', id).single();

export const updateProfile = (id, data) =>
  supabase.from('profiles').update(data).eq('id', id).select().single();

// ── Sessions ──────────────────────────────────────────────────────────────────
export const createSession = (userId) =>
  supabase.from('sessions').insert({ user_id: userId }).select().single();

export const getSession_ = (id, userId) =>
  supabase.from('sessions').select('*, actions(*)').eq('id', id).eq('user_id', userId).single();

export const listSessions = (userId) =>
  supabase.from('sessions').select('*, actions(id,text,completed)')
    .eq('user_id', userId).eq('status', 'COMPLETED')
    .order('started_at', { ascending: false });

export const updateSession = (id, data) =>
  supabase.from('sessions').update(data).eq('id', id).select().single();

export const abandonInProgress = (userId) =>
  supabase.from('sessions').update({ status: 'ABANDONED' })
    .eq('user_id', userId).eq('status', 'IN_PROGRESS');

// ── Actions ───────────────────────────────────────────────────────────────────
export const createAction = (data) =>
  supabase.from('actions').insert(data).select().single();

export const listActions = (userId) =>
  supabase.from('actions').select('*, sessions(id,started_at)')
    .eq('user_id', userId).order('created_at', { ascending: false });

export const updateAction = (id, data) =>
  supabase.from('actions').update(data).eq('id', id).select().single();

export const deleteAction = (id) =>
  supabase.from('actions').delete().eq('id', id);

// ── Insights ──────────────────────────────────────────────────────────────────
export const insertInsights = (insights) =>
  supabase.from('session_insights').insert(insights);

export const getAdminDashboard = async (weeksBack = 8) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeksBack * 7);
  const since = cutoff.toISOString();

  const [
    { data: profiles, error: e1 },
    { data: sessions, error: e2 },
    { data: insights, error: e3 },
  ] = await Promise.all([
    supabase.from('profiles').select('id, department, role'),
    supabase.from('sessions').select('id, user_id, status, mood_score, sentiment_score, started_at, completed_at')
      .gte('started_at', since),
    supabase.from('session_insights').select('*').gte('created_at', since),
  ]);

  return { profiles, sessions, insights, errors: [e1, e2, e3].filter(Boolean) };
};

export const getMyStats = async (userId) => {
  const [
    { data: sessions },
    { data: actions },
  ] = await Promise.all([
    supabase.from('sessions').select('id, status, mood_score, sentiment_score, started_at')
      .eq('user_id', userId).order('started_at', { ascending: true }),
    supabase.from('actions').select('id, completed').eq('user_id', userId),
  ]);
  return { sessions: sessions || [], actions: actions || [] };
};

// ── Documents ─────────────────────────────────────────────────────────────────
export const uploadDocument = async (file, userId) => {
  const path = `${userId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from('documents').upload(path, file);
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('documents').getPublicUrl(path);

  const { data: doc, error } = await supabase.from('documents').insert({
    user_id: userId,
    name: file.name,
    storage_path: path,
    content_type: file.type,
    size: file.size,
  }).select().single();
  if (error) throw error;
  return doc;
};

export const listDocuments = (userId) =>
  supabase.from('documents').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false });

export const getDocumentUrl = (path) =>
  supabase.storage.from('documents').createSignedUrl(path, 3600);

export const deleteDocument = async (id, storagePath) => {
  await supabase.storage.from('documents').remove([storagePath]);
  return supabase.from('documents').delete().eq('id', id);
};

// ── Transcript storage ────────────────────────────────────────────────────────
export const uploadTranscript = async (sessionId, userId, text) => {
  const path = `${userId}/${sessionId}.txt`;
  const blob = new Blob([text], { type: 'text/plain' });
  const { error } = await supabase.storage.from('transcripts').upload(path, blob, { upsert: true });
  if (error) throw error;
  return path;
};

export const getTranscriptUrl = (path) =>
  supabase.storage.from('transcripts').createSignedUrl(path, 3600);
