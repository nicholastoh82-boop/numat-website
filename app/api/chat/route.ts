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

-- Seed knowledge entries
INSERT INTO nara_knowledge (category, question, answer, keywords) VALUES
('product', 'What products does NUMAT make?', 'NUMAT makes four engineered bamboo products: NuFloor (bamboo flooring for commercial and hospitality spaces), NuBoard (structural boards replacing plywood and MDF), NuSlat (decorative wall and ceiling slats), and NuPanel (interior composite panels). All use Dendrocalamus asper — the highest-grade structural bamboo.', ARRAY['products','nufloor','nuboard','nuslat','nupanel','bamboo','what','make','sell']),
('product', 'What is NuFloor?', 'NuFloor is NUMAT''s engineered bamboo flooring product. It is designed for high-traffic commercial and hospitality environments — hotels, resorts, offices, restaurants, and residential developments. It offers the warmth and aesthetics of wood with superior hardness, moisture resistance, and sustainability credentials.', ARRAY['nufloor','flooring','floor','bamboo floor']),
('product', 'What is NuBoard?', 'NuBoard is NUMAT''s structural bamboo board, designed as a sustainable replacement for plywood and MDF in construction and interior fit-out projects. It offers higher strength-to-weight ratio than plywood and is made from 100% Dendrocalamus asper bamboo.', ARRAY['nuboard','board','plywood','mdf','structural','construction']),
('company', 'Where is NUMAT based?', 'NUMAT Sustainable Manufacturing Inc. is registered in the Philippines and backed by WaveMaker Impact, a Singapore-based sustainability-focused venture fund. We primarily serve markets across Southeast Asia including the Philippines, Malaysia, and Singapore.', ARRAY['where','based','location','company','philippines','singapore']),
('company', 'What bamboo species does NUMAT use?', 'NUMAT uses Dendrocalamus asper — considered the gold standard of structural bamboo species. It grows in the Philippines, matures in 3-5 years (versus 25-50 years for hardwood trees), and sequesters significantly more carbon than timber alternatives. This makes NUMAT products both high-performance and highly sustainable.', ARRAY['species','bamboo','dendrocalamus','asper','type','material','sustainable']),
('process', 'How do I get a quote or pricing?', 'Pricing depends on the product, finish, volume, and delivery location. Our team prepares detailed quotes after understanding your project specifications. The fastest way is to share your project type, location, and estimated area in sqm — I can collect that now and have our specialist follow up with a full quote within 24 hours.', ARRAY['price','pricing','quote','cost','how much','rate']),
('process', 'How long does delivery take?', 'Lead times vary by product and volume. For standard orders within the Philippines and Malaysia, typical lead time is 4-8 weeks from order confirmation. For larger custom orders or export shipments, our team will confirm exact timelines during the quotation process.', ARRAY['delivery','lead time','shipping','how long','timeline','when']),
('faq', 'Is bamboo flooring durable?', 'Yes — engineered bamboo from Dendrocalamus asper is significantly harder than most hardwoods, including oak. NUMAT''s NuFloor is designed specifically for high-traffic commercial environments like hotel lobbies, restaurant floors, and office fit-outs. It is also more dimensionally stable than timber in humid tropical climates.', ARRAY['durable','durability','hard','hardness','strong','last','wear']),
('faq', 'Is NUMAT bamboo sustainable or eco-friendly?', 'Yes. Bamboo is one of the fastest-growing plants on earth — Dendrocalamus asper matures in 3-5 years compared to 25-50 years for hardwood. It also sequesters more carbon per hectare than most tree species. NUMAT sources from sustainable farms in the Philippines, supporting local farming communities while providing a genuinely low-carbon building material.', ARRAY['sustainable','eco','green','carbon','environment','fsc','certification']),
('faq', 'What markets or countries does NUMAT serve?', 'NUMAT''s primary markets are the Philippines, Malaysia, and Singapore. We also serve projects in Indonesia, Thailand, Vietnam, Australia, and the Middle East. If your project is in a different country, contact us and we can discuss export options.', ARRAY['country','market','serve','ship','export','where','available']);
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

  // Search by keyword array overlap
  const { data: byKeywords } = await supabase
    .from('nara_knowledge')
    .select('id, category, question, answer, keywords')
    .eq('is_active', true)
    .overlaps('keywords', keywords)
    .limit(5)

  // Also search by question text for top keywords
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

  // Merge, deduplicate, and score by relevance
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
      ? knowledgeEntries
          .map(e => `Q: ${e.question}\nA: ${e.answer}`)
          .join('\n\n')
      : 'No specific knowledge entries matched this query.'

  return `You are NARA — NUMAT Autonomous Response Assistant. You help visitors understand NUMAT's bamboo products and qualify their project needs.

ABOUT NUMAT:
NUMAT Sustainable Manufacturing Inc. is a Philippines-based manufacturer of engineered bamboo building materials, backed by WaveMaker Impact (Singapore). We use Dendrocalamus asper bamboo — the highest-grade structural bamboo species — grown sustainably in the Philippines.

PRODUCTS:
- NuFloor: Engineered bamboo flooring. High durability, suitable for high-traffic commercial and hospitality spaces. Available in various finishes and plank sizes.
- NuBoard: Structural bamboo boards. Used as replacement for plywood and MDF in construction and fit-out projects.
- NuSlat: Bamboo slats for decorative wall cladding, ceiling features, and acoustic panels.
- NuPanel: Bamboo composite panels for interior applications.

PRIMARY MARKETS: Philippines, Malaysia, Singapore
SECONDARY MARKETS: Indonesia, Thailand, Vietnam, Australia, Middle East

WEBSITE: numatbamboo.com
CONTACT: sales@numat.ph

RELEVANT KNOWLEDGE FOR THIS CONVERSATION:
${knowledgeBlock}

RULES:
- Answer questions using the knowledge provided above
- If you do not have a specific answer in your knowledge base, say: 'That is a great question — I will flag this for our team and they will include the answer in a follow-up. Would you like me to have someone reach out directly?'
- Never make up specifications, prices, or technical data
- Be warm, professional, and concise (1-3 sentences per reply)
- After answering questions, naturally guide towards understanding their project — ask about their project type, location, and scale
- Once you have collected name, company, project type, location, and area in sqm — say a specialist will contact them within 24 hours
- When ready to mark the lead complete, append the following TWO items at the very end of your message, in this exact order:
  1. A hidden structured data block in this exact format (fill in only what was collected, leave others as empty string):
     <!--LEAD_DATA:{"contact_name":"","company":"","email":"","phone":"","country":"","industry":"","project_type":"","area_sqm":"","location":"","timeline":"","budget":"","decision_maker":""}-->
  2. Immediately after: [LEAD_COMPLETE]
- Never show or mention the LEAD_DATA block or [LEAD_COMPLETE] tag to the user — they must be invisible`
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
    const {
      messages,
      session_id,
      page_url,
    }: { messages: ChatMessage[]; session_id: string; page_url?: string } = body

    if (!session_id || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const userAgent = request.headers.get('user-agent') || undefined
    const lastMsg = messages[messages.length - 1]
    const userQuestion = lastMsg?.content || ''

    // Non-blocking: upsert session and save user message (tables may not exist yet)
    supabase.from('chat_sessions').upsert(
      { id: session_id, page_url: page_url || null, user_agent: userAgent || null },
      { onConflict: 'id', ignoreDuplicates: true }
    ).then(() => {})

    if (lastMsg?.role === 'user') {
      supabase.from('chat_messages').insert({
        session_id,
        role: 'user',
        content: lastMsg.content,
        knowledge_used: [],
      }).then(() => {})
    }

    // Search knowledge base (safe — returns empty on error)
    const { entries: knowledgeEntries, hasResults } = await searchKnowledge(supabase, userQuestion)

    // Non-blocking: log unanswered questions
    if (!hasResults && userQuestion.length > 15 && lastMsg?.role === 'user') {
      supabase.from('nara_unanswered').insert({ session_id, question: userQuestion }).then(() => {})
    }

    // Build system prompt with relevant knowledge injected
    const systemPrompt = buildSystemPrompt(knowledgeEntries)
    const knowledgeIds = knowledgeEntries.map(e => e.id)

    // Call Claude — this is the critical path
    const claudeRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
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
    const rawText: string =
      claudeData.content?.[0]?.text ||
      "I'm sorry, I had a connection issue. Please email us at sales@numat.ph"

    const isComplete = rawText.includes('[LEAD_COMPLETE]')

    // Extract structured lead data from hidden comment block
    let leadData: Record<string, string> = {}
    const leadDataMatch = rawText.match(/<!--LEAD_DATA:(\{.*?\})-->/)
    if (leadDataMatch) {
      try { leadData = JSON.parse(leadDataMatch[1]) } catch { /* ignore parse errors */ }
    }

    // Strip both the hidden block and the tag — user never sees either
    const text = rawText
      .replace(/<!--LEAD_DATA:\{[\s\S]*?\}-->/, '')
      .replace('[LEAD_COMPLETE]', '')
      .trim()

    // Non-blocking: save assistant response (clean text, no hidden tags)
    supabase.from('chat_messages').insert({
      session_id,
      role: 'assistant',
      content: text,
      knowledge_used: knowledgeIds,
    }).then(() => {})

    // Mark session complete and fire n8n webhook with structured data
    if (isComplete) {
      supabase
        .from('chat_sessions')
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
          // Structured fields — populated from LEAD_DATA block
          ...leadData,
          // Fallback email extraction if not in structured data
          email: leadData.email || fullConvo.match(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/)?.[0] || null,
          notes: `NARA conversation:\n\n${fullConvo}`,
        }),
      }).catch(e => console.error('[NARA Webhook] Failed:', e))
    }

    return NextResponse.json({ text, isComplete })
  } catch (error) {
    console.error('[NARA] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
