'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PROJECT_TYPES = [
  'Hotel', 'Resort', 'Restaurant, Cafe, or Food Centre', 'Commercial',
  'Refurbishment or Reclamation', 'Alteration and Addition', 'Residential', 'Other'
]
const PROJECT_STAGES = [
  'Concept and Feasibility', 'Pre Construction', 'Schematic Design',
  'Under Construction', 'On Hold', 'Cancelled or Abandoned', 'Other'
]
const SUPPORT_TYPES = [
  'Bamboo materials supply', 'Design Input', 'Design and Build',
  'Interior or fit out', 'Landscape or external works',
  'Sustainability or Regenerative Strategy', 'Unsure, would like to discuss'
]
const TIMELINES = ['Within 3 months', '3 to 6 months', '6 to 12 months', 'More than 12 months', 'Not sure yet']
const BUDGETS = ['Below RM100,000', 'RM100,000 to RM500,000', 'RM500,000 to RM1 million', 'Above RM1 million', 'Prefer not to say']
const SUSTAIN = ['Very important', 'Somewhat important', 'Not a priority yet', 'Not sure']
const FOLLOWUP = ['Yes', 'No', 'Maybe, after internal discussion']

interface FormData {
  full_name: string
  company: string
  title: string
  email: string
  phone: string
  preferred_contact: string
  project_name: string
  project_types: string[]
  project_stages: string[]
  support_types: string[]
  project_description: string
  timeline: string
  budget: string
  site_constraints: string
  sustainability: string
  decision_makers: string
  follow_up: string
  honeypot: string
}

const initial: FormData = {
  full_name: '', company: '', title: '', email: '', phone: '',
  preferred_contact: '', project_name: '',
  project_types: [], project_stages: [], support_types: [],
  project_description: '', timeline: '', budget: '',
  site_constraints: '', sustainability: '', decision_makers: '',
  follow_up: '', honeypot: ''
}

export default function QualifyPage() {
  const router = useRouter()
  const [data, setData] = useState<FormData>(initial)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (k: keyof FormData, v: any) => setData(d => ({ ...d, [k]: v }))
  const toggleArr = (k: 'project_types' | 'project_stages' | 'support_types', v: string) => {
    setData(d => ({ ...d, [k]: d[k].includes(v) ? d[k].filter(x => x !== v) : [...d[k], v] }))
  }

  const validate = (): string | null => {
    if (!data.full_name.trim()) return 'Full name is required'
    if (!data.company.trim()) return 'Company is required'
    if (!data.title.trim()) return 'Job title is required'
    if (!data.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'Valid email is required'
    if (!data.phone.trim()) return 'Phone or WhatsApp number is required'
    if (!data.preferred_contact) return 'Pick a preferred contact method'
    if (data.project_types.length === 0) return 'Select at least one project type'
    if (data.project_stages.length === 0) return 'Select the project stage'
    if (data.support_types.length === 0) return 'Tell us what support you need'
    if (!data.project_description.trim()) return 'Briefly describe the project'
    if (!data.timeline) return 'Pick an expected timeline'
    if (!data.budget) return 'Pick an approximate budget range'
    if (!data.sustainability) return 'Tell us how important sustainability is'
    if (!data.follow_up) return 'Tell us if you would like a consultation'
    return null
  }

  const submit = async () => {
    setError(null)
    const v = validate()
    if (v) { setError(v); return }
    setSubmitting(true)
    try {
      const resp = await fetch('/api/qualify/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json.error || `Submit failed (${resp.status})`)
      router.push('/qualify/thank-you')
    } catch (err: any) {
      setError(err.message ?? 'Submission failed, please try again')
      setSubmitting(false)
    }
  }

  const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="mb-5">
      <label className="block text-sm font-semibold text-gray-800 mb-2">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
    </div>
  )

  const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent" />
  )

  const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent min-h-[100px]" />
  )

  const Radio = ({ name, value, current, onChange, label }: any) => (
    <label className="flex items-center gap-2 py-1 cursor-pointer">
      <input type="radio" name={name} value={value} checked={current === value} onChange={() => onChange(value)} className="text-emerald-600 focus:ring-emerald-600" />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )

  const Check = ({ value, current, onChange, label }: any) => (
    <label className="flex items-center gap-2 py-1 cursor-pointer">
      <input type="checkbox" checked={current.includes(value)} onChange={() => onChange(value)} className="rounded text-emerald-600 focus:ring-emerald-600" />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <div className="text-xs font-bold tracking-widest text-emerald-700 mb-2">NUMAT and SEAD</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Project Inquiry and Qualification</h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            Thank you for your interest. This short form helps us understand your project requirements,
            timeline, and suitability so that the right team can follow up with you.
          </p>
        </div>

        {/* Section 1 */}
        <section className="mb-10 pb-8 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Section 1: Contact Details</h2>
          <p className="text-xs text-gray-500 mb-5">So we can identify the right person to follow up with.</p>

          <Field label="Full Name" required>
            <Input value={data.full_name} onChange={e => update('full_name', e.target.value)} />
          </Field>
          <Field label="Company or Organisation" required>
            <Input value={data.company} onChange={e => update('company', e.target.value)} />
          </Field>
          <Field label="Job title or role" required>
            <Input value={data.title} onChange={e => update('title', e.target.value)} />
          </Field>
          <Field label="Email address" required>
            <Input type="email" value={data.email} onChange={e => update('email', e.target.value)} />
          </Field>
          <Field label="Phone or WhatsApp number" required>
            <Input value={data.phone} onChange={e => update('phone', e.target.value)} />
          </Field>
          <Field label="Preferred contact method" required>
            {['Email', 'Phone Call', 'WhatsApp'].map(o =>
              <Radio key={o} name="contact" value={o} current={data.preferred_contact} onChange={(v: string) => update('preferred_contact', v)} label={o} />
            )}
          </Field>

          {/* honeypot */}
          <input type="text" tabIndex={-1} autoComplete="off" value={data.honeypot} onChange={e => update('honeypot', e.target.value)} className="hidden" aria-hidden="true" />
        </section>

        {/* Section 2 */}
        <section className="mb-10 pb-8 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Section 2: Project Information</h2>
          <p className="text-xs text-gray-500 mb-5">Helps us understand whether the project fits the current outreach focus.</p>

          <Field label="Project name">
            <Input value={data.project_name} onChange={e => update('project_name', e.target.value)} />
          </Field>
          <Field label="What type of project is this?" required>
            <p className="text-xs text-gray-500 mb-2">Select all that apply.</p>
            {PROJECT_TYPES.map(o =>
              <Check key={o} value={o} current={data.project_types} onChange={(v: string) => toggleArr('project_types', v)} label={o} />
            )}
          </Field>
          <Field label="What stage is the project currently in?" required>
            <p className="text-xs text-gray-500 mb-2">Select all that apply.</p>
            {PROJECT_STAGES.map(o =>
              <Check key={o} value={o} current={data.project_stages} onChange={(v: string) => toggleArr('project_stages', v)} label={o} />
            )}
          </Field>
          <Field label="What kind of support are you looking for?" required>
            <p className="text-xs text-gray-500 mb-2">Select all that apply.</p>
            {SUPPORT_TYPES.map(o =>
              <Check key={o} value={o} current={data.support_types} onChange={(v: string) => toggleArr('support_types', v)} label={o} />
            )}
          </Field>
          <Field label="Briefly describe the project and what you are trying to achieve" required>
            <Textarea value={data.project_description} onChange={e => update('project_description', e.target.value)} />
          </Field>
        </section>

        {/* Section 3 */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Section 3: Timeline, Budget, and Readiness</h2>
          <p className="text-xs text-gray-500 mb-5">Quick qualification before follow up.</p>

          <Field label="Expected project timeline" required>
            {TIMELINES.map(o =>
              <Radio key={o} name="timeline" value={o} current={data.timeline} onChange={(v: string) => update('timeline', v)} label={o} />
            )}
          </Field>
          <Field label="Approximate budget range for this scope" required>
            {BUDGETS.map(o =>
              <Radio key={o} name="budget" value={o} current={data.budget} onChange={(v: string) => update('budget', v)} label={o} />
            )}
          </Field>
          <Field label="Site accessibility or logistics constraints">
            <Textarea value={data.site_constraints} onChange={e => update('site_constraints', e.target.value)} />
          </Field>
          <Field label="Is sustainability or low carbon material selection important for this project?" required>
            {SUSTAIN.map(o =>
              <Radio key={o} name="sus" value={o} current={data.sustainability} onChange={(v: string) => update('sustainability', v)} label={o} />
            )}
          </Field>
          <Field label="Main decision makers involved in this project">
            <Textarea value={data.decision_makers} onChange={e => update('decision_makers', e.target.value)} />
          </Field>
          <Field label="Would you like a follow up consultation from the SEAD team?" required>
            {FOLLOWUP.map(o =>
              <Radio key={o} name="fu" value={o} current={data.follow_up} onChange={(v: string) => update('follow_up', v)} label={o} />
            )}
          </Field>
        </section>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-400 text-white font-semibold rounded-md transition"
        >
          {submitting ? 'Submitting...' : 'Submit inquiry'}
        </button>

        <p className="mt-6 text-xs text-gray-400 text-center">
          Your details are shared with the NUMAT and SEAD teams for project follow up only.
        </p>
      </div>
    </div>
  )
}
