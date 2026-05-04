// app/api/gmail/connect-status/route.ts
// Returns which reps currently have a valid Gmail connection.
// GET /api/gmail/connect-status

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/gmail';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('rep_gmail_tokens')
    .select('rep_email, rep_name, connected_at, last_used_at, is_active');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reps: data ?? [] });
}
