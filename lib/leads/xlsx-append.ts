// lib/leads/xlsx-append.ts
//
// Appends rows to one worksheet of an existing .xlsx file WITHOUT rewriting
// the rest of the workbook. Only the target worksheet's XML is changed; every
// other part of the file (other tabs, styles, formulas, comments, drawings,
// Google metadata) is carried over byte for byte. Cells are written as inline
// strings or numbers, so sharedStrings.xml is never touched.
//
// Used to log website submissions into the shared sales tracker, which lives
// in Google Drive as an .xlsx file (the Sheets API cannot write to it).

import { unzipSync, zipSync, strFromU8, strToU8, type Zippable } from 'fflate'

export type CellValue = string | number | null | undefined

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Characters XML 1.0 does not allow at all.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
}

function columnLetter(index: number): string {
  let n = index + 1
  let out = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

function rowXml(rowNumber: number, values: CellValue[]): string {
  const cells = values
    .map((value, i) => {
      if (value == null || value === '') return ''
      const ref = `${columnLetter(i)}${rowNumber}`
      if (typeof value === 'number' && Number.isFinite(value)) {
        return `<c r="${ref}"><v>${value}</v></c>`
      }
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`
    })
    .join('')
  return `<row r="${rowNumber}">${cells}</row>`
}

/** Resolve a tab name to its worksheet part, e.g. "website" -> "xl/worksheets/sheet4.xml". */
function worksheetPath(files: Record<string, Uint8Array>, tabName: string): string {
  const workbook = strFromU8(files['xl/workbook.xml'])
  const rels = strFromU8(files['xl/_rels/workbook.xml.rels'])
  const sheets = [...workbook.matchAll(/<sheet\b[^>]*>/g)].map((m) => m[0])
  const attr = (tag: string, name: string) =>
    tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1]
  const decode = (s: string) =>
    s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  const sheet = sheets.find((tag) => decode(attr(tag, 'name') ?? '').trim().toLowerCase() === tabName.trim().toLowerCase())
  if (!sheet) throw new Error(`Tab "${tabName}" not found in workbook`)
  const rid = attr(sheet, 'r:id')
  const rel = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((tag) => attr(tag, 'Id') === rid)
  const target = rel && attr(rel, 'Target')
  if (!target) throw new Error(`No worksheet part for tab "${tabName}"`)
  const path = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`
  if (!files[path]) throw new Error(`Worksheet part ${path} missing`)
  return path
}

/**
 * Returns a new .xlsx with `rows` appended to `tabName`. When the tab has no
 * rows yet, `headerRow` is written first.
 */
export function appendRowsToXlsx(
  xlsx: Uint8Array,
  tabName: string,
  rows: CellValue[][],
  headerRow?: CellValue[],
): Uint8Array {
  const files = unzipSync(xlsx)
  const path = worksheetPath(files, tabName)
  const xml = strFromU8(files[path])

  const rowNumbers = [...xml.matchAll(/<row\b[^>]*\br="(\d+)"/g)].map((m) => Number(m[1]))
  let next = rowNumbers.length ? Math.max(...rowNumbers) + 1 : 1

  const toWrite: CellValue[][] = []
  if (rowNumbers.length === 0 && headerRow) toWrite.push(headerRow)
  toWrite.push(...rows)
  const newRows = toWrite.map((values) => rowXml(next++, values)).join('')

  let updated: string
  if (/<sheetData\s*\/>/.test(xml)) {
    updated = xml.replace(/<sheetData\s*\/>/, `<sheetData>${newRows}</sheetData>`)
  } else if (xml.includes('</sheetData>')) {
    updated = xml.replace('</sheetData>', `${newRows}</sheetData>`)
  } else {
    throw new Error(`Worksheet ${path} has no sheetData`)
  }

  // A stale <dimension ref="A1:P9"/> is harmless, but drop it so readers
  // recompute the used range instead of trusting an outdated one.
  updated = updated.replace(/<dimension\b[^>]*\/>/, '')

  const out: Zippable = {}
  for (const [name, data] of Object.entries(files)) {
    out[name] = name === path ? strToU8(updated) : data
  }
  return zipSync(out, { level: 6 })
}
