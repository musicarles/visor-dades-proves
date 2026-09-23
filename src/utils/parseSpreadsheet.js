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
    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true })
    const headers = []
    const rows = []
    if (aoa.length > 0) {
      const head = aoa[0].map((h) => (h === null || h === undefined ? '' : String(h).trim()))
      const handled = new Set()
      headers.push(...head.map((h, i) => (h ? h : `Columna ${i + 1}`)))
      for (const line of aoa.slice(1)) {
        if (line.every((v) => v === null || v === undefined || String(v).trim() === '')) continue
        const obj = {}
        head.forEach((h, i) => {
          const key = h || `Columna ${i + 1}`
          obj[key] = line[i]
        })
        rows.push(obj)
      }
    }
    sheets[name] = { name, aoa, headers, rows }
  }

  return { fileName: file.name, sheetNames: workbook.SheetNames, sheets }
}