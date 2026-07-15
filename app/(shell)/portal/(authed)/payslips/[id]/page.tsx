/* app/portal/(authed)/payslips/[id]/page.tsx
   One payslip, laid out like the company template with NUMAT Sustainable
   Manufacturing Inc details. Own or admin only. Download or print uses the
   browser, so no extra software is needed. */

import { requirePortalUser } from '@/lib/portal/roles'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { PrintButton } from '@/components/portal/payslips-tools'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Payslip | NUMAT Portal',
  robots: 'noindex, nofollow',
}

const COMPANY = {
  name: 'Numat Sustainable Manufacturing Inc.',
  line1: 'Warehouse B22, Barangay Alae',
  line2: 'Manolo Fortich 8703',
  line3: 'Bukidnon, Mindanao',
  finance: 'finance@numat.ph',
}

type Earning = { date: string; description: string; amount: number }
type Payslip = {
  id: string
  user_id: string | null
  employee_name: string
  employee_role: string | null
  department: string | null
  period_label: string
  period_start: string | null
  period_end: string | null
  pay_date: string | null
  reference_no: string | null
  currency: string
  earnings: Earning[] | null
  gross: number
  deductions: number
  net: number
}

function adminClient() {
  return createAdmin(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

function amount2(n: number): string {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const ONES = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function below1000(n: number): string {
  let s = ''
  if (n >= 100) {
    s += `${ONES[Math.floor(n / 100)]} Hundred`
    n %= 100
    if (n) s += ' '
  }
  if (n >= 20) {
    s += TENS[Math.floor(n / 10)]
    n %= 10
    if (n) s += ` ${ONES[n]}`
  } else if (n > 0) {
    s += ONES[n]
  }
  return s
}

function intToWords(n: number): string {
  if (n === 0) return 'Zero'
  const scales: [string, number][] = [['Billion', 1e9], ['Million', 1e6], ['Thousand', 1e3]]
  let words = ''
  for (const [name, val] of scales) {
    if (n >= val) {
      words += `${words ? ' ' : ''}${below1000(Math.floor(n / val))} ${name}`
      n %= val
    }
  }
  if (n > 0) words += `${words ? ' ' : ''}${below1000(n)}`
  return words
}

function currencyNames(code: string): { major: string; minor: string } {
  const c = code.toUpperCase()
  if (c === 'USD') return { major: 'US Dollars', minor: 'Cents' }
  if (c === 'PHP') return { major: 'Philippine Pesos', minor: 'Centavos' }
  if (c === 'SGD') return { major: 'Singapore Dollars', minor: 'Cents' }
  return { major: c, minor: 'Cents' }
}

function amountInWords(total: number, code: string): string {
  const whole = Math.floor(total)
  const cents = Math.round((total - whole) * 100)
  const { major, minor } = currencyNames(code)
  return `${major} ${intToWords(whole)} and ${minor} ${intToWords(cents)} Only`
}

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #payslip, #payslip * { visibility: visible !important; }
  #payslip { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; }
  .no-print { display: none !important; }
  @page { margin: 12mm; }
}
`

export default async function PayslipViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requirePortalUser()

  let row: Payslip | null = null
  if (user.isAdmin) {
    const { data } = await adminClient().from('staff_payslips').select('*').eq('id', id).maybeSingle()
    row = (data as Payslip) || null
  } else {
    const supabase = await createClient()
    const { data } = await supabase
      .from('staff_payslips')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    row = (data as Payslip) || null
  }

  if (!row) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-gray-900">Payslip</h1>
        <p className="text-sm text-gray-500">This payslip was not found, or it is not yours to view.</p>
      </div>
    )
  }

  const cur = row.currency
  const earnings = row.earnings || []

  return (
    <div className="space-y-4">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="no-print flex items-center justify-between gap-3">
        <a href="/portal/payslips" className="text-sm text-gray-500 hover:text-gray-800">
          Back to payslips
        </a>
        <PrintButton />
      </div>

      <div id="payslip" className="mx-auto max-w-3xl rounded-lg border border-gray-200 bg-white p-8 text-sm text-gray-800">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/numat-icon.jpeg" alt="NUMAT" className="h-12 w-12 rounded" />
            <div className="text-lg font-bold tracking-wide text-[#16361f]">NUMAT</div>
          </div>
          <div className="text-right text-xs text-gray-600">
            <div className="text-sm font-bold text-gray-900">{COMPANY.name}</div>
            <div>{COMPANY.line1}</div>
            <div>{COMPANY.line2}</div>
            <div>{COMPANY.line3}</div>
          </div>
        </div>

        <div className="mt-4 border-t-2 border-[#16361f]" />

        <div className="mt-4">
          <h1 className="text-2xl font-bold text-[#16361f]">PAYSLIP</h1>
          <p className="text-gray-600">Salary statement for the period of {row.period_label}</p>
        </div>

        {/* Detail boxes */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded border border-gray-200">
            <div className="bg-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white">
              Employee details
            </div>
            <div className="space-y-1 p-3">
              <Row label="Employee Name" value={row.employee_name} />
              {row.employee_role && <Row label="Position" value={row.employee_role} />}
              {row.department && <Row label="Department" value={row.department} />}
            </div>
          </div>
          <div className="rounded border border-gray-200">
            <div className="bg-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white">
              Pay details
            </div>
            <div className="space-y-1 p-3">
              <Row label="Pay Period" value={`${fmtDate(row.period_start)} to ${fmtDate(row.period_end)}`} />
              <Row label="Pay Date" value={fmtDate(row.pay_date)} />
              <Row label="Payment Method" value="Bank Transfer" />
              {row.reference_no && <Row label="Reference No." value={row.reference_no} />}
            </div>
          </div>
        </div>

        {/* Earnings */}
        <div className="mt-5 overflow-hidden rounded border border-gray-200">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-700 text-xs uppercase tracking-wide text-white">
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Earnings description</th>
                <th className="px-3 py-2 text-right font-semibold">Amount ({cur})</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((e, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-3 py-2 text-gray-600">{fmtDate(e.date)}</td>
                  <td className="px-3 py-2 text-gray-800">{e.description}</td>
                  <td className="px-3 py-2 text-right text-gray-800">{amount2(e.amount)}</td>
                </tr>
              ))}
              <tr className="bg-[#16361f] text-white">
                <td className="px-3 py-2 font-semibold" colSpan={2}>
                  Total Gross Earnings
                </td>
                <td className="px-3 py-2 text-right font-semibold">{amount2(row.gross)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Deductions */}
        <div className="mt-4 overflow-hidden rounded border border-gray-200">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-700 text-xs uppercase tracking-wide text-white">
                <th className="px-3 py-2 font-semibold">Deductions</th>
                <th className="px-3 py-2 text-right font-semibold">Amount ({cur})</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-100">
                <td className="px-3 py-2 text-gray-600">Income Tax, contributions, other</td>
                <td className="px-3 py-2 text-right text-gray-800">{amount2(row.deductions)}</td>
              </tr>
              <tr className="bg-[#16361f] text-white">
                <td className="px-3 py-2 font-semibold">Total Deductions</td>
                <td className="px-3 py-2 text-right font-semibold">{amount2(row.deductions)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Net pay */}
        <div className="mt-4 flex items-center justify-between rounded bg-[#16361f] px-4 py-3 text-white">
          <span className="text-sm font-semibold uppercase tracking-wide">Net pay (take home)</span>
          <span className="text-lg font-bold">
            {cur} {amount2(row.net)}
          </span>
        </div>

        <div className="mt-3 rounded bg-gray-50 px-3 py-2 text-xs text-gray-600">
          <span className="font-semibold">Amount in words: </span>
          {amountInWords(Number(row.net || 0), cur)}
        </div>

        <p className="mt-5 text-center text-[11px] italic text-gray-400">
          This is a system generated payslip. No signature is required. For any queries regarding this
          payslip, please contact the Finance department at {COMPANY.finance}. Please retain this
          document for your personal records.
        </p>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  )
}
