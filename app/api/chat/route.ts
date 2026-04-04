/*
SQL — run in Supabase SQL Editor to create all required tables:

CREATE TABLE nara_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_sessions (
  id TEXT PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed BOOLEAN NOT NULL DEFAULT false,
  lead_submitted BOOLEAN NOT NULL DEFAULT false,
  page_url TEXT,
  user_agent TEXT
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  knowledge_used TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON chat_messages(session_id);
CREATE INDEX ON chat_messages(created_at DESC);

CREATE TABLE nara_unanswered (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  question TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved BOOLEAN NOT NULL DEFAULT false
);
*/

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const N8N_WEBHOOK = 'https://nicholastoh.app.n8n.cloud/webhook/numat-lead'
const STOP_WORDS = new Set(['a','an','the','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','shall','can','need','dare','ought','used','i','me','my','we','our','you','your','he','she','it','they','them','his','her','its','their','what','which','who','whom','this','that','these','those','am','at','by','for','in','of','on','or','to','up','and','but','if','or','nor','so','yet','both','either','neither','not','only','own','same','than','too','very','just','how','when','where','why','all','any','each','few','more','most','other','some','such','no','as'])

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 12)
}

interface KnowledgeEntry {
  id: string
  category: string
  question: string
  answer: string
  keywords: string[]
}

async function searchKnowledge(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userMessage: string
): Promise<{ entries: KnowledgeEntry[]; hasResults: boolean }> {
  const keywords = extractKeywords(userMessage)

  if (keywords.length === 0) {
    const { data } = await supabase
      .from('nara_knowledge')
      .select('id, category, question, answer, keywords')
      .eq('is_active', true)
      .limit(3)
    return { entries: data || [], hasResults: (data?.length ?? 0) > 0 }
  }

  const { data: byKeywords } = await supabase
    .from('nara_knowledge')
    .select('id, category, question, answer, keywords')
    .eq('is_active', true)
    .overlaps('keywords', keywords)
    .limit(5)

  const topKeywords = keywords.slice(0, 3)
  const questionFilters = topKeywords.map(k => `question.ilike.%${k}%`).join(',')
  const byQuestionQuery = supabase
    .from('nara_knowledge')
    .select('id, category, question, answer, keywords')
    .eq('is_active', true)
    .limit(5)
  const { data: byQuestion } = questionFilters
    ? await byQuestionQuery.or(questionFilters)
    : await byQuestionQuery

  const seen = new Set<string>()
  const merged: (KnowledgeEntry & { score: number })[] = []

  const score = (entry: KnowledgeEntry) => {
    let s = 0
    const entryKws = entry.keywords.map(k => k.toLowerCase())
    const questionLower = entry.question.toLowerCase()
    for (const kw of keywords) {
      if (entryKws.includes(kw)) s += 2
      if (questionLower.includes(kw)) s += 1
    }
    return s
  }

  for (const e of [...(byKeywords || []), ...(byQuestion || [])]) {
    if (!seen.has(e.id)) {
      seen.add(e.id)
      merged.push({ ...e, score: score(e) })
    }
  }

  merged.sort((a, b) => b.score - a.score)
  const top5 = merged.slice(0, 5)
  return { entries: top5, hasResults: top5.length > 0 }
}

function buildSystemPrompt(knowledgeEntries: KnowledgeEntry[]): string {
  const knowledgeBlock =
    knowledgeEntries.length > 0
      ? knowledgeEntries.map(e => `Q: ${e.question}\nA: ${e.answer}`).join('\n\n')
      : 'No specific knowledge entries matched this query.'

  return `You are NARA — NUMAT Autonomous Response Assistant. You help visitors understand NUMAT's bamboo products and qualify their project needs.

ABOUT NUMAT:
NUMAT Sustainable Manufacturing Inc. is a Philippines-based manufacturer of engineered bamboo building materials, backed by WaveMaker Impact (Singapore). We use Dendrocalamus asper bamboo — the highest-grade structural bamboo species — grown sustainably in the Philippines.

PRODUCTS:
- NuFloor: Engineered bamboo flooring for high-traffic commercial and hospitality spaces.
- NuBoard: Structural bamboo boards replacing plywood and MDF in construction and fit-out projects.
- NuSlat: Bamboo slats for decorative wall cladding, ceiling features, and acoustic panels.
- NuPanel: Bamboo composite panels for interior applications.

PRIMARY MARKETS: Philippines, Malaysia, Singapore
SECONDARY MARKETS: Indonesia, Thailand, Vietnam, Australia, Middle East
WEBSITE: numatbamboo.com | CONTACT: sales@numat.ph

RELEVANT KNOWLEDGE FOR THIS CONVERSATION:
${knowledgeBlock}

LEAD SCORING (use to determine tier for LEAD_DATA):
- HOT (score 7-10): Hotel/Resort/Interior Design firm OR large commercial project + decision maker + specific area in sqm + Philippines/Malaysia/Singapore
- WARM (score 4-6.9): Mid-size company, designer/PM, general project interest, SEA region
- COLD (score 0-3.9): Residential only with no commercial angle, unknown company, no clear project, outside SEA

RULES:
- Answer questions using the knowledge provided above only
- If you do not have a specific answer, say: "That is a great question — I will flag this for our team. Would you like me to have someone reach out directly?"
- Never make up specifications, prices, or technical data
- Be warm, professional, concise — 1-3 sentences per reply
- After answering, guide towards understanding their project — ask about type, location, scale
- Once you have collected name, company, project type, location, and area in sqm — complete the lead
- When ready to complete, append BOTH items below at the very end of your message:
  1. Hidden data block (fill what was collected, assess tier and score honestly):
     <!--LEAD_DATA:{"contact_name":"","company":"","email":"","phone":"","country":"","industry":"","project_type":"","area_sqm":"","location":"","timeline":"","budget":"","decision_maker":"","tier":"WARM","score":"5.0"}-->
  2. Immediately after: [LEAD_COMPLETE]
- NEVER show or mention LEAD_DATA or [LEAD_COMPLETE] to the user`
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Chat service not configured' }, { status: 503 })
    }

    const body = await request.json()
    const { messages, session_id, page_url }: {
      messages: ChatMessage[]
      session_id: string
      page_url?: string
    } = body

    if (!session_id || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const userAgent = request.headers.get('user-agent') || undefined
    const lastMsg = messages[messages.length - 1]
    const userQuestion = lastMsg?.content || ''

    // Non-blocking: upsert session
    supabase.from('chat_sessions').upsert(
      { id: session_id, page_url: page_url || null, user_agent: userAgent || null },
      { onConflict: 'id', ignoreDuplicates: true }
    ).then(() => {})

    // Save user message
    if (lastMsg?.role === 'user') {
      supabase.from('chat_messages').insert({
        session_id, role: 'user', content: lastMsg.content, knowledge_used: [],
      }).then(() => {})
    }

    // Search knowledge base
    const { entries: knowledgeEntries, hasResults } = await searchKnowledge(supabase, userQuestion)

    // Log unanswered questions
    if (!hasResults && userQuestion.length > 15 && lastMsg?.role === 'user') {
      supabase.from('nara_unanswered').insert({ session_id, question: userQuestion }).then(() => {})
    }

    const systemPrompt = buildSystemPrompt(knowledgeEntries)
    const knowledgeIds = knowledgeEntries.map(e => e.id)

    // Call Claude with correct model name
    const claudeRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: systemPrompt,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.json().catch(() => ({}))
      console.error('[NARA] Claude API error:', err)
      return NextResponse.json({ error: 'AI service error' }, { status: 502 })
    }

    const claudeData = await claudeRes.json()
    const rawText: string = claudeData.content?.[0]?.text ||
      "I'm sorry, I had a connection issue. Please email us at sales@numat.ph"

    const isComplete = rawText.includes('[LEAD_COMPLETE]')

    // Extract structured lead data including tier and score
    let leadData: Record<string, string> = {}
    const leadDataMatch = rawText.match(/<!--LEAD_DATA:(\{.*?\})-->/)
    if (leadDataMatch) {
      try { leadData = JSON.parse(leadDataMatch[1]) } catch { /* ignore */ }
    }

    // Strip hidden block and tag — user never sees these
    const text = rawText
      .replace(/<!--LEAD_DATA:\{[\s\S]*?\}-->/, '')
      .replace('[LEAD_COMPLETE]', '')
      .trim()

    // Extract tier and score for Calendly gating in the frontend
    const tier = leadData.tier || null
    const score = leadData.score ? parseFloat(leadData.score) : null

    // Save assistant response
    supabase.from('chat_messages').insert({
      session_id, role: 'assistant', content: text, knowledge_used: knowledgeIds,
    }).then(() => {})

    // On lead complete — update session and fire n8n webhook with structured data
    if (isComplete) {
      supabase.from('chat_sessions')
        .update({ completed: true, lead_submitted: true })
        .eq('id', session_id)
        .then(() => {})

      const fullConvo = [...messages, { role: 'assistant', content: text }]
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n\n')

      fetch(N8N_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'NARA',
          lead_source: 'Website',
          session_id,
          ...leadData,
          email: leadData.email ||
            fullConvo.match(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/)?.[0] || null,
          notes: `NARA conversation:\n\n${fullConvo}`,
        }),
      }).catch(e => console.error('[NARA Webhook] Failed:', e))
    }

    // Return text + tier + score — frontend uses tier to decide whether to show Calendly
    return NextResponse.json({ text, isComplete, tier, score })

  } catch (error) {
    console.error('[NARA] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}