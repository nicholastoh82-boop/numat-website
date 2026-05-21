// app/api/crm/production/forecast/route.ts
//
// Read-only endpoint exposing the production forecasting views:
//   vw_prod_monthly         monthly actuals by SKU family
//   vw_prod_board_forecast  3-month board output forecast
//   vw_prod_material_forecast veneers + slats implied by the forecast
//
// Honest note on methodology: this is a blended 3-month moving average +
// linear trend forecast computed in Postgres. With ~6 months of data and
// volumes scaling rapidly, ARIMA / Vertex AI Forecast would overfit. When
// production stabilises at 12+ months of monthly data, swap this for
// BigQuery ML ARIMA_PLUS without changing the response shape.

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

async function authorizeUser(): Promise<{ email: string } | null> {
  try {
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      },
    );
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user?.email) return null;
    const { data: crmUser } = await adminClient
      .from('crm_users')
      .select('email, role, is_active')
      .eq('email', user.email)
      .single();
    if (!crmUser?.is_active || !['rep', 'admin'].includes(crmUser.role ?? '')) return null;
    return { email: crmUser.email };
  } catch {
    return null;
  }
}

export async function GET() {
  const user = await authorizeUser();
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [monthly, slatMonthly, boardForecast, materialForecast] = await Promise.all([
    adminClient
      .from('vw_prod_monthly')
      .select('*')
      .order('month', { ascending: true })
      .limit(120),
    adminClient
      .from('vw_prod_slat_monthly')
      .select('*')
      .order('month', { ascending: true })
      .limit(120),
    adminClient
      .from('vw_prod_board_forecast')
      .select('*')
      .order('forecast_month', { ascending: true }),
    adminClient
      .from('vw_prod_material_forecast')
      .select('*')
      .order('forecast_month', { ascending: true }),
  ]);

  return NextResponse.json({
    monthly: monthly.data ?? [],
    slat_monthly: slatMonthly.data ?? [],
    board_forecast: boardForecast.data ?? [],
    material_forecast: materialForecast.data ?? [],
    notes: [
      'Forecast uses a blended 3-month moving average and linear trend, floored at the most recent observation.',
      'For 12+ months of data, this graduates to BigQuery ML ARIMA_PLUS without changing the API shape.',
    ],
  });
}
