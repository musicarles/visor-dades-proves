export function parseItems(value) {
  if (!value) return []
  return String(value)
    .split(/[\n;]+/)
    .map((s) => s.trim())
    .filter((s) => s && s !== '—' && s !== '-')
    .map((s) => {
      const m = s.match(/^(.*?)\s*\((\d+)\)\s*$/)
      if (m) return { name: m[1].trim(), count: parseInt(m[2], 10) || 1 }
      return { name: s, count: 1 }
    })
}

export function extractRecords(sheets) {
  const records = []
  for (const area of Object.keys(sheets)) {
    const sheet = sheets[area]
    if (!sheet || !sheet.rows.length) continue
    const headers = sheet.headers
    const labelCol = headers[0]
    const measureCols = headers.slice(1)
    for (const row of sheet.rows) {
      const category = String(row[labelCol] ?? '')
      for (const col of measureCols) {
        for (const item of parseItems(row[col])) {
          records.push({ area, category, label: col, name: item.name, count: item.count })
        }
      }
    }
  }
  return records
}

export function aggregateByName(records) {
  const map = new Map()
  for (const r of records) {
    const cur = map.get(r.name) || { name: r.name, freq: 0 }
    cur.freq += r.count
    map.set(r.name, cur)
  }
  return [...map.values()].sort((a, b) => b.freq - a.freq)
}

export function sumByName(records) {
  const map = new Map()
  for (const r of records) {
    map.set(r.name, (map.get(r.name) || 0) + r.count)
  }
  return map
}

export function pluralize(n) {
  return n === 1 ? 'vegada' : 'vegades'
}

export function pivotByCategory(records, cols) {
  const categories = [...new Set(records.map((r) => r.category))]
  return categories.map((cat) => {
    const row = { category: cat }
    for (const c of cols) row[c] = 0
    for (const r of records) {
      if (r.category === cat && r.label in row) row[r.label] += r.count
    }
    return row
  })
}