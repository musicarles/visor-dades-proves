export const DEFAULT_COURSES = ['I3', 'I4', 'I5', '1r', '2n', '3r', '4t', '5è', '6è']
export const TERM_LABELS = ['1r trimestre', '2n trimestre', '3r trimestre']
export const UNKNOWN_COURSE = '—'

function strip(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// --- Parseig de cel·les simples (format matriu tabulat) ---

export function parseItems(value) {
  if (!value) return []
  return String(value)
    .split(/[\n;,]+/)
    .map((s) => s.trim())
    .filter((s) => s && s !== '—' && s !== '-')
    .map((s) => {
      const m = s.match(/^(.*?)\s*\((\d+)\)\s*$/)
      if (m) return { name: m[1].trim(), count: parseInt(m[2], 10) || 1 }
      return { name: s, count: 1 }
    })
}

// --- Cursos ---

function courseKey(c) {
  const m = strip(String(c)).toLowerCase().match(/^(i\d|\d)/)
  return m ? m[0] : null
}

export function expandCourses(expr, courseList) {
  const list = Array.isArray(courseList) && courseList.length ? courseList : DEFAULT_COURSES
  if (!expr) return [UNKNOWN_COURSE]

  const s = strip(String(expr)).toLowerCase()
  if (/(tots els cursos|tots|tota l'escola|totes|tots el curs|tots els)/.test(s)) return [...list]
  if (/(primària|1r a 6|1er a 6|1 a 6)/.test(s)) return list.filter((n) => !n.startsWith('I'))
  if (/(infantil|educació infantil|i3 a i5)/.test(s)) return list.filter((n) => n.startsWith('I'))

  const keyIndex = {}
  list.forEach((c, i) => {
    const k = courseKey(c)
    if (k) keyIndex[k] = i
  })

  const lookup = (token) => {
    if (!token) return null
    const k = courseKey(token)
    return k != null && k in keyIndex ? keyIndex[k] : null
  }

  const out = new Set()
  const normalized = s.replace(/\s+fins\s+(?:a|al)\s+/g, ' - ').replace(/[–]/g, '-')
  const specs = normalized.split(/\s*(?:[,;\n/]| i | y |&)\s*/).filter(Boolean)

  for (const spec of specs) {
    const pieces = spec.match(/^(.+?)\s+(?:a|al|-)\s+(.+)$/)
    if (pieces) {
      const a = lookup(pieces[1])
      const b = lookup(pieces[2])
      if (a != null && b != null) {
        const lo = Math.min(a, b)
        const hi = Math.max(a, b)
        for (let i = lo; i <= hi; i++) out.add(list[i])
        continue
      }
    }
    const idx = lookup(spec)
    if (idx != null) out.add(list[idx])
  }
  if (out.size === 0) return [UNKNOWN_COURSE]
  return list.filter((c) => out.has(c))
}

// --- Termes ---

export function hasTermInfo(expr) {
  if (!expr) return false
  const s = strip(String(expr)).toLowerCase().replace(/trimestres?/g, 't')
  return /(\d)\s*\w{0,3}\s*t|t\s*(\d)/.test(s)
}

export function parseTerms(expr) {
  if (expr == null) return [1, 2, 3]
  const s = strip(String(expr)).toLowerCase()
  if (/(trimestral|tots|totes|sempre|durant tot|cada trimestre|continu)/.test(s)) return [1, 2, 3]
  const t = s.replace(/trimestres?\b/g, 't')
  const set = new Set()
  const re = /(\d)\s*\w{0,3}\s*t|t\s*(\d)/g
  let m
  while ((m = re.exec(t))) set.add(Number(m[1] || m[2]))
  if (set.size === 0) return [1, 2, 3]
  return [1, 2, 3].filter((x) => set.has(x))
}

// --- Línia estructurada: "cursos - prova - [matís] - termes" ---

function looksLikeCourseExpr(s) {
  return /^i?\d|[0-9]\s*(?:r|on)?\s*(?:a|al|-)|infantil|primària|tots|tota|totes/.test(strip(s).toLowerCase())
}

export function isStructuredLine(line) {
  const segs = String(line)
    .split(/\s*[-–]\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (segs.length < 2) return false
  return looksLikeCourseExpr(segs[0]) || hasTermInfo(segs[segs.length - 1])
}

export function parseStructuredLine(line, courseList) {
  const segs = String(line)
    .split(/\s*[-–]\s*/)
    .map((s) => s.trim())
    .filter(Boolean)

  let courseExpr = null
  let proveSegs = segs
  let termExpr = null

  if (segs.length >= 2) {
    courseExpr = segs[0]
    const last = segs[segs.length - 1]
    if (hasTermInfo(last)) {
      termExpr = last
      proveSegs = segs.slice(1, -1)
    } else {
      proveSegs = segs.slice(1)
    }
  }

  const courses = expandCourses(courseExpr, courseList)
  const terms = parseTerms(termExpr)

  let proveRaw = proveSegs.join(' ').trim()
  let count = 1
  const m = proveRaw.match(/^(.*?)\s*\((\d+)\)\s*$/)
  if (m) {
    proveRaw = m[1].trim()
    count = parseInt(m[2], 10) || 1
  }

  return { courses, terms, prove: proveRaw || '(sense nom)', count }
}

// --- Full → registres ---

export function detectSheetType(sheet) {
  const headers = (sheet.aoa[0] || []).map((h) => String(h || '').toLowerCase())
  const matrixSignal = headers.slice(1).some((h) => /trimestre/.test(h))
  if (matrixSignal) return 'matrix'

  let structured = 0
  let cells = 0
  for (let i = 1; i < sheet.aoa.length; i++) {
    for (const cell of sheet.aoa[i]) {
      const v = String(cell || '')
      if (!v.trim()) continue
      cells++
      for (const line of v.split(/\n+/)) {
        if (isStructuredLine(line)) {
          structured++
          break
        }
      }
    }
  }
  return structured > 0 && cells > 0 ? 'raw' : 'matrix'
}

export function matrixSheetToRecords(sheet) {
  const aoa = sheet.aoa
  const headers = aoa[0] || []
  const records = []
  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r]
    const course = String(row[0] ?? '').trim() || UNKNOWN_COURSE
    for (let c = 1; c < headers.length; c++) {
      for (const item of parseItems(row[c])) {
        records.push({ area: sheet.name, course, term: c, prove: item.name, count: item.count })
      }
    }
  }
  return records
}

export function rawSheetToRecords(sheet, columnMap, courseList) {
  const aoa = sheet.aoa
  const records = []
  const colIndex = new Map()
  for (const [letter, name] of Object.entries(columnMap || {})) {
    const idx = letterToIndex(letter)
    if (idx != null) colIndex.set(idx, name)
  }

  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r]
    for (const [idx, area] of colIndex) {
      const v = row[idx]
      if (v == null) continue
      for (const line of String(v).split(/\n+/)) {
        if (!line.trim()) continue
        const parsed = parseStructuredLine(line, courseList)
        for (const course of parsed.courses) {
          for (const term of parsed.terms) {
            records.push({
              area,
              course,
              term,
              prove: parsed.prove,
              count: parsed.count,
            })
          }
        }
      }
    }
  }
  return records
}

export function sheetToRecords(sheet, opts) {
  if (sheet.type === 'raw') return rawSheetToRecords(sheet, opts.columnMap, opts.courses)
  return matrixSheetToRecords(sheet)
}

// --- Agregacions ---

export function aggregateByName(records) {
  const map = new Map()
  for (const r of records) {
    const cur = map.get(r.prove) || { name: r.prove, freq: 0 }
    cur.freq += r.count
    map.set(r.prove, cur)
  }
  return [...map.values()].sort((a, b) => b.freq - a.freq)
}

export function sumByName(records) {
  const map = new Map()
  for (const r of records) {
    map.set(r.prove, (map.get(r.prove) || 0) + r.count)
  }
  return map
}

export function distinctAreas(records, courseList) {
  const list = Array.isArray(courseList) ? courseList : DEFAULT_COURSES
  const areas = [...new Set(records.map((r) => r.area))]
  const courses = [
    ...list.filter((c) => records.some((r) => r.course === c)),
    ...[...new Set(records.map((r) => r.course))].filter((c) => !list.includes(c)),
  ]
  return { areas, courses }
}

export function pivotByCourseTerm(records, termKeys) {
  const rows = []
  const index = new Map()
  for (const r of records) {
    let row = index.get(r.course)
    if (!row) {
      row = { course: r.course }
      for (const t of termKeys) row[t] = 0
      index.set(r.course, row)
      rows.push(row)
    }
  }
  for (const r of records) {
    const row = index.get(r.course)
    if (r.term in row) row[r.term] += r.count
  }
  return { rows, index }
}

export function pluralize(n) {
  return n === 1 ? 'vegada' : 'vegades'
}

function letterToIndex(letter) {
  const up = String(letter || '').toUpperCase().trim()
  if (!/^[A-Z]{1,2}$/.test(up)) return null
  let n = 0
  for (const ch of up) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

export function indexToLetter(idx) {
  let n = idx + 1
  let s = ''
  while (n > 0) {
    n--
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26)
  }
  return s
}