// app/api/cron/obsidian-daily-log/route.ts
//
// Runs daily at midnight MYT (16:00 UTC).
// Calls Claude API to summarize the day's work across NUMAT and Kastelon,
// then commits a markdown note to the vault GitHub repo.
// Obsidian Git plugin pulls the note automatically.
//
// Vercel cron schedule: "0 16 * * *"

import { NextRequest, NextResponse } from 'next/server'

const VAULT_REPO  = process.env.VAULT_GITHUB_REPO!   // e.g. nicholastoh82-boop/nick-second-brain
const GITHUB_TOKEN = process.env.GITHUB_TOKEN!
const AI_GATEWAY  = process.env.CLOUDFLARE_AI_GATEWAY_URL!
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!

function getMYTDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' })
  // returns YYYY-MM-DD
}

function getMYTDatetime(): string {
  return new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })
}

async function generateDailySummary(date: string): Promise<string> {
  const systemPrompt = `You are Nick Toh's personal chief of staff. Nick runs NUMAT Sustainable Manufacturing Inc. (Philippines, engineered bamboo panels) and Kastelon Pte Ltd (Singapore, B2B revenue engine). You are writing his daily Obsidian note for ${date}.

Write a clean markdown note summarising the day across both companies. Structure it as:

# Daily Log: ${date}

## What moved today
(2 to 4 bullet points on the most significant things that progressed, shipped, or were decided)

## NUMAT
(status on pipeline, operations, outreach, open items)

## Kastelon
(status on clients, agents, outreach, open items)

## Decisions made
(any decisions confirmed today)

## Open items carried forward
(things not yet resolved that need attention tomorrow)

## Notes


---
*Auto-generated at midnight MYT by Vercel Cron*

Use only what you know is factually grounded. Do not invent data. If unsure about a specific figure, omit it. Keep the note concise and factual. No hyphens or dashes anywhere, use commas, colons, or parentheses instead.`

  const response = await fetch(`${AI_GATEWAY}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Write the daily Obsidian log for ${date}. Today is ${getMYTDatetime()} MYT.`,
        },
      ],
    }),
  })

  const data = await response.json()
  const text = data.content?.[0]?.text || `# Daily Log: ${date}\n\nAuto-generation failed. Check Vercel logs.\n`
  return text
}

async function getExistingFile(date: string): Promise<{ sha: string | null }> {
  const path = `Daily/${date}.md`
  const url = `https://api.github.com/repos/${VAULT_REPO}/contents/${encodeURIComponent(path)}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  })
  if (res.status === 404) return { sha: null }
  const data = await res.json()
  return { sha: data.sha || null }
}

async function commitNote(date: string, content: string): Promise<void> {
  const path = `Daily/${date}.md`
  const url = `https://api.github.com/repos/${VAULT_REPO}/contents/${encodeURIComponent(path)}`
  const { sha } = await getExistingFile(date)

  const body: Record<string, string> = {
    message: `Daily log: ${date} (auto-generated at midnight MYT)`,
    content: Buffer.from(content).toString('base64'),
    branch: 'main',
  }
  if (sha) body.sha = sha

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GitHub commit failed: ${res.status} ${err}`)
  }
}

async function handle(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const date = getMYTDate()

  try {
    const summary = await generateDailySummary(date)
    await commitNote(date, summary)
    return NextResponse.json({ success: true, date, message: `Daily log committed for ${date}` })
  } catch (err) {
    console.error('obsidian-daily-log error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET(req: NextRequest) { return handle(req) }
export async function POST(req: NextRequest) { return handle(req) }
