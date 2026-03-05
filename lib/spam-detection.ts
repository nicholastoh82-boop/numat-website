/**
 * Spam Detection Utility
 * Detects and scores potential spam submissions
 */

interface SpamCheckResult {
  isLikelySpam: boolean
  score: number
  reasons: string[]
}

// Known spam keywords and patterns
const SPAM_KEYWORDS = [
  'viagra', 'cialis', 'casino', 'lottery', 'click here', 'buy now',
  'free money', 'nigerian prince', 'bitcoin', 'cryptocurrency', 'forex',
  'cheap', 'discount', 'limited time', 'urgent', 'act now'
]

const URL_PATTERNS = /https?:\/\/|www\.|\.com|\.net|\.org/gi

/**
 * Check for suspicious patterns in text
 */
function detectSpamPatterns(text: string): { score: number; reasons: string[] } {
  const score = { value: 0 }
  const reasons: string[] = []
  const lowerText = text.toLowerCase()

  // Check for spam keywords
  SPAM_KEYWORDS.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      score.value += 10
      reasons.push(`Contains spam keyword: "${keyword}"`)
    }
  })

  // Check for excessive URLs
  const urlMatches = text.match(URL_PATTERNS) || []
  if (urlMatches.length > 2) {
    score.value += 15
    reasons.push(`Contains multiple URLs (${urlMatches.length})`)
  }

  // Check for repeated characters
  if (/(.)\1{4,}/.test(text)) {
    score.value += 5
    reasons.push('Contains excessive repeated characters')
  }

  // Check for excessive caps
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length
  if (capsRatio > 0.4) {
    score.value += 5
    reasons.push('Excessive capital letters')
  }

  // Check for numbers only or mostly numbers
  const numberRatio = (text.match(/\d/g) || []).length / text.length
  if (numberRatio > 0.5) {
    score.value += 10
    reasons.push('Excessive numbers')
  }

  return { score: score.value, reasons }
}

/**
 * Check if email looks suspicious
 */
function checkEmailSuspicious(email: string): { score: number; reasons: string[] } {
  const score = { value: 0 }
  const reasons: string[] = []
  const lowerEmail = email.toLowerCase()

  // Check for disposable email domains
  const disposableDomains = ['tempmail', 'guerrillamail', 'mailinator', '10minutemail', 'throwaway']
  disposableDomains.forEach(domain => {
    if (lowerEmail.includes(domain)) {
      score.value += 20
      reasons.push(`Disposable email domain: ${domain}`)
    }
  })

  // Check for suspicious patterns in local part
  if (lowerEmail.match(/\d{5,}/)) {
    score.value += 5
    reasons.push('Email contains long number sequence')
  }

  // Check for too many dots/underscores
  const specialChars = (lowerEmail.match(/[._-]/g) || []).length
  if (specialChars > 5) {
    score.value += 5
    reasons.push('Excessive special characters in email')
  }

  return { score: score.value, reasons }
}

/**
 * Check for duplicate/suspicious phone patterns
 */
function checkPhoneSuspicious(phone: string): { score: number; reasons: string[] } {
  const score = { value: 0 }
  const reasons: string[] = []

  if (!phone) return { score: 0, reasons: [] }

  // Check for repeated digits
  if (/(\d)\1{3,}/.test(phone)) {
    score.value += 10
    reasons.push('Phone has excessive repeated digits')
  }

  // Check if it's all zeros or ones
  if (/^[0-9]{1}$/.test(phone.replace(/\D/g, ''))) {
    score.value += 15
    reasons.push('Phone appears to be test data')
  }

  return { score: score.value, reasons }
}

/**
 * Main spam detection function
 */
export function detectSpam(data: {
  name: string
  email: string
  phone?: string
  message: string
  subject?: string
}): SpamCheckResult {
  let totalScore = 0
  const allReasons: string[] = []

  // Check message content
  const messageCheck = detectSpamPatterns(data.message)
  totalScore += messageCheck.score
  allReasons.push(...messageCheck.reasons)

  // Check email
  const emailCheck = checkEmailSuspicious(data.email)
  totalScore += emailCheck.score
  allReasons.push(...emailCheck.reasons)

  // Check phone if provided
  if (data.phone) {
    const phoneCheck = checkPhoneSuspicious(data.phone)
    totalScore += phoneCheck.score
    allReasons.push(...phoneCheck.reasons)
  }

  // Check name
  const nameCheck = detectSpamPatterns(data.name)
  totalScore += nameCheck.score * 0.5 // Lower weight for name
  allReasons.push(...nameCheck.reasons)

  // Check for very short messages (likely spam/bot)
  if (data.message.length < 5) {
    totalScore += 10
    allReasons.push('Message is too short')
  }

  // Threshold: score >= 30 is considered likely spam
  const isLikelySpam = totalScore >= 30

  return {
    isLikelySpam,
    score: totalScore,
    reasons: [...new Set(allReasons)], // Remove duplicates
  }
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .trim()
}

/**
 * Validate common submission patterns
 */
export function validateSubmissionPattern(data: {
  name: string
  email: string
  message: string
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Name validation
  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters')
  }

  if (data.name.length > 100) {
    errors.push('Name is too long')
  }

  // Email validation (basic)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(data.email)) {
    errors.push('Invalid email format')
  }

  // Message validation
  if (!data.message || data.message.trim().length < 5) {
    errors.push('Message must be at least 5 characters')
  }

  if (data.message.length > 5000) {
    errors.push('Message is too long')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
