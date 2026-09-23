import * as XLSX from 'xlsx'

export async function parseSpreadsheet(file) {
  let buffer
  try {
    buffer = await file.arrayBuffer()
  } catch {
    throw new Error('No s ha pogut llegir el fitxer.')
  }

  let workbook
  try {
    workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  } catch {
    throw new Error('No s ha pogut llegir el fitxer. Revisa que sigui un .xlsx o .csv vàlid.')
  }

  if (workbook.SheetNames.length === 0) {
    throw new Error('El fitxer no conté cap full de dades.')
  }

  const sheets = {}
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true })

    if (rows.length === 0) {
      sheets[name] = { rows: [], headers: [], columns: [] }
      continue
    }

    const headers = Object.keys(rows[0])
    const columns = headers.map((h) => ({
      name: h,
      numeric: isNumericColumn(rows, h),
    }))

    sheets[name] = { rows, headers, columns }
  }

  return { fileName: file.name, sheetNames: workbook.SheetNames, sheets }
}

export function seriesValue(column, row) {
  const v = row[column.name]
  if (column.numeric) {
    if (typeof v === 'number' && Number.isFinite(v)) return v
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  if (v === null || v === undefined) return 0
  const items = String(v)
    .split(/[\n;,]+/)
    .map((s) => s.trim())
    .filter((s) => s && s !== '—' && s !== '-')
  return items.length
}

function isNumericColumn(rows, header) {
  let nonEmpty = 0
  let numeric = 0
  for (const row of rows) {
    const v = row[header]
    if (v === null || v === undefined || v === '') continue
    nonEmpty++
    const n = typeof v === 'number' ? v : Number(String(v).trim())
    if (typeof n === 'number' && !Number.isNaN(n)) numeric++
  }
  return nonEmpty > 0 && numeric / nonEmpty >= 0.8
}