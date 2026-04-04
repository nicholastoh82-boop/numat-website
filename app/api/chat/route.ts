import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const N8N_WEBHOOK = 'https://nicholastoh.app.n8n.cloud/webhook/numat-lead'

const SYSTEM_PROMPT = `You are Nara, NUMAT's friendly bamboo flooring specialist assistant. NUMAT Sustainable Manufacturing makes premium engineered bamboo flooring (NuFloor), boards (NuBoard), slats (NuSlat), and panels (NuPanel) for hospitality, commercial, and residential projects across Southeast Asia.

Your job is to have a warm, professional conversation to understand the visitor's project needs. Ask ONE question at a time, conversationally. Collect these details naturally:

1. Their name and company
2. Type of project (hotel, resort, office, restaurant, residential, other)
3. Project location (city/country)
4. Estimated floor area in sqm
5. Project timeline (when do they need the materials?)
6. Are they the decision maker for material selection?
7. Approximate budget range (if comfortable sharing)
8. What other flooring options they're currently considering

Guidelines:
- Be warm and conversational, not robotic
- Ask one question at a time
- If they give partial info, acknowledge it and ask the next question
- After collecting all key info (at minimum: name, company, project type, location, area), tell them a NUMAT specialist will reach out within 24 hours
- When you have collected enough information, end your message with exactly this tag: [LEAD_COMPLETE]
- Keep responses concise — 1-3 sentences max
- Do not mention the tag to the user
- If they ask about pricing, say pricing depends on product selection and volume, and the team will provide a detailed quote after understanding their project

Start by greeting them warmly and asking for their name and company.`

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function fetchLearnedContext(supabase: ReturnType<typeof createClient>): Promise<string> {
  try {
    // Fetch recent Q&A pairs from past conversations to augment Nara's knowledge
    const { data } = await supabase
      .from('chat_messages')
      .select('role, content, session_id')
      .order('created_at', { ascending: false })
      .limit(60)

    if (!data || data.length === 0) return ''

    // Pair up user questions with the next assistant reply
    const pairs: { question: string; answer: string }[] = []
    for (let i = 0; i < data.length - 1; i++) {
      if (data[i].role === 'assistant' && data[i + 1]?.role === 'user') {
        pairs.push({ question: data[i + 1].content, answer: data[i].content })
        if (pairs.length >= 10) break
      }
    }

    if (pairs.length === 0) return ''

    const examples = pairs
      .map((p, idx) => `Example ${idx + 1}:\nCustomer: ${p.question}\nNara: ${p.answer}`)
      .join('\n\n')

    return `\n\n--- LEARNED FROM PAST CONVERSATIONS ---\nHere are real examples of how you have handled past customer interactions. Use these to stay consistent and improve your responses:\n\n${examples}\n--- END LEARNED CONTEXT ---`
  } catch {
    return ''
  }
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function extractLeadData(messages: ChatMessage[]) {
  const text = messages.map(m => m.content).join(' ')
  const data: Record<string, string | null> = {}
  const emailMatch = text.match(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/)
  if (emailMatch) data.email = emailMatch[0]
  const sqmMatch = text.match(/(\d[\d,]*)\s*(?:sqm|sq\.?m|square\s*meters?)/i)
  if (sqmMatch) data.area_sqm = sqmMatch[1]
  return data
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Chat service not configured' }, { status: 503 })
    }

    const body = await request.json()
    const { messages, sessionId }: { messages: ChatMessage[]; sessionId?: string } = body

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Fetch learned context from stored conversations
    const learnedContext = supabase ? await fetchLearnedContext(supabase) : ''
    const systemWithLearning = SYSTEM_PROMPT + learnedContext

    // Call Claude API server-side
    const claudeRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: systemWithLearning,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.json()
      console.error('[Chat] Claude API error:', err)
      return NextResponse.json({ error: 'AI service error' }, { status: 502 })
    }

    const claudeData = await claudeRes.json()
    const rawText: string = claudeData.content?.[0]?.text || "I'm sorry, I had a connection issue. Please email us at hello@numat.ph"
    const isComplete = rawText.includes('[LEAD_COMPLETE]')
    const text = rawText.replace('[LEAD_COMPLETE]', '').trim()

    // Persist session and messages in Supabase for learning
    let activeSessionId = sessionId
    if (supabase) {
      try {
        if (!activeSessionId) {
          const { data: session } = await supabase
            .from('chat_sessions')
            .insert({ lead_submitted: false })
            .select('id')
            .single()
          activeSessionId = session?.id
        }

        if (activeSessionId) {
          // Store the latest user message + this assistant reply
          const lastUserMsg = messages[messages.length - 1]
          const toInsert = []
          if (lastUserMsg?.role === 'user') {
            toInsert.push({ session_id: activeSessionId, role: 'user', content: lastUserMsg.content })
          }
          toInsert.push({ session_id: activeSessionId, role: 'assistant', content: text })
          await supabase.from('chat_messages').insert(toInsert)

          // If lead is complete, update session and fire webhook
          if (isComplete) {
            const allMessages: ChatMessage[] = [...messages, { role: 'assistant', content: text }]
            const extracted = extractLeadData(allMessages)
            const fullConversation = allMessages
              .map(m => `${m.role.toUpperCase()}: ${m.content}`)
              .join('\n\n')

            await supabase
              .from('chat_sessions')
              .update({ lead_submitted: true, lead_data: extracted })
              .eq('id', activeSessionId)

            // Fire n8n webhook
            fetch(N8N_WEBHOOK, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                source: 'Website Chatbot',
                lead_source: 'Chatbot',
                session_id: activeSessionId,
                ...extracted,
                notes: `Chatbot conversation:\n\n${fullConversation}`,
              }),
            }).catch(e => console.error('[Chat Webhook] Failed:', e))
          }
        }
      } catch (dbErr) {
        // DB errors don't block the response
        console.error('[Chat] DB error:', dbErr)
      }
    }

    return NextResponse.json({ text, sessionId: activeSessionId, isComplete })
  } catch (error) {
    console.error('[Chat] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
