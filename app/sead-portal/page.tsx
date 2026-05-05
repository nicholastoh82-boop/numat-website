import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import SeadDashboard from '@/components/sead-portal/SeadDashboard'
import SeadLoginForm from '@/components/sead-portal/SeadLoginForm'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SESSION_KEY = process.env.SEAD_PORTAL_SESSION_KEY

export default async function SeadPortalPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get('sead_session')?.value
  const authed = Boolean(SESSION_KEY) && session === SESSION_KEY

  if (!authed) {
    return <SeadLoginForm />
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: leads, error } = await sb
    .from('master_leads')
    .select('id, full_name, email, phone, title, company, country, segment, sub_segment, rep_assigned, pipeline_stage, status, source, source_payload, created_at, last_activity_at, last_activity_type, notes')
    .like('source', 'sead_qualification%')
    .order('created_at', { ascending: false })
    .limit(500)

  return (
    <SeadDashboard
      leads={leads ?? []}
      error={error?.message ?? null}
    />
  )
}
