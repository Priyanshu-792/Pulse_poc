/**
 * emailjs.js — PULSE Manager Email Notifications via EmailJS
 *
 * Sends a structured coaching session report to the manager after each session.
 * Uses EmailJS browser SDK (no backend needed).
 *
 * Setup:
 *   1. Create a free account at https://www.emailjs.com
 *   2. Add a Gmail (or any) email service → copy your Service ID
 *   3. Create an email template using the variables listed below → copy Template ID
 *   4. Go to Account → API Keys → copy your Public Key
 *   5. Add these to frontend/.env:
 *        VITE_EMAILJS_SERVICE_ID=service_xxxxxxx
 *        VITE_EMAILJS_TEMPLATE_ID=template_xxxxxxx
 *        VITE_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxxx
 *
 * Template variables used (set these in your EmailJS template):
 *   {{to_email}}           — manager's email address
 *   {{employee_name}}      — employee's name
 *   {{session_date}}       — formatted date of the session
 *   {{overall_sentiment}}  — positive | neutral | needs attention
 *   {{mood_score}}         — numeric mood score (e.g. "7/10") or "Not recorded"
 *   {{checkin_summary}}    — Check-In section (30-50 words)
 *   {{work_summary}}       — Work & Workload section (30-50 words)
 *   {{team_summary}}       — Team & Culture section (30-50 words)
 *   {{growth_summary}}     — Growth & Aspirations section (30-50 words)
 *   {{actions_summary}}    — Actions Committed section (30-50 words)
 */

import emailjs from '@emailjs/browser';

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// Manager's email — hardcoded for demo; swap with profile.manager_email from Supabase later
const MANAGER_EMAIL = 'priyanshu.sharma@softway.com';

/**
 * Sends the post-session coaching report to the manager.
 *
 * @param {object} params
 * @param {string} params.employeeName   — employee's full name
 * @param {number|null} params.moodScore — mood score 1-10 or null
 * @param {object} params.report         — sections from generateManagerReport()
 *   { checkin, work, team, growth, actions, overall_sentiment }
 */
export const sendManagerReport = async ({ employeeName, moodScore, report }) => {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    console.warn('[EmailJS] Keys not set — skipping email. Add VITE_EMAILJS_* to .env');
    return { skipped: true };
  }

  const sentimentEmoji = {
    'positive':       '🟢 Positive',
    'neutral':        '🟡 Neutral',
    'needs attention':'🔴 Needs Attention',
  }[report.overall_sentiment] || '🟡 Neutral';

  const templateParams = {
    to_email:          MANAGER_EMAIL,
    employee_name:     employeeName,
    session_date:      new Date().toLocaleDateString('en-US', {
                         weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                       }),
    overall_sentiment: sentimentEmoji,
    mood_score:        moodScore ? `${moodScore}/10` : 'Not recorded',
    checkin_summary:   report.checkin,
    work_summary:      report.work,
    team_summary:      report.team,
    growth_summary:    report.growth,
    actions_summary:   report.actions,
  };

  try {
    const result = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
    console.log('[EmailJS] Manager report sent ✓', result.status);
    return { success: true };
  } catch (err) {
    console.error('[EmailJS] Failed to send report:', err);
    return { success: false, error: err };
  }
};
