const STOPWORDS = new Set([
  'de', 'del', 'dels', 'la', 'las', 'les', 'el', 'los', 'els', 'l', 'i', 'o', 'y',
  'a', 'al', 'als', 'per', 'en', 'd', 'proves', 'prova', 'trimestral', 'un', 'una',
])

export function normalizeName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .join(' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
}

export function similarity(a, b) {
  if (a === b) return 1
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.length >= 3 && (nb.includes(na) || na.includes(nb))) return 0.75
  const ta = new Set(na.split(' '))
  const tb = new Set(nb.split(' '))
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter++
  return inter / (ta.size + tb.size - inter)
}

export function resolveName(name, map) {
  return (map && map[name]) || name
}

export function applyCanonical(records, map) {
  if (!map || Object.keys(map).length === 0) return records
  return records.map((r) => ({
    ...r,
    raw: r.raw || r.prove,
    prove: resolveName(r.prove, map),
  }))
}

const MIN_SIMILARITY = 0.62

export function buildSuggestionClusters(entries) {
  const n = entries.length
  const parents = Array.from({ length: n }, (_, i) => i)
  const find = (x) => {
    while (parents[x] !== x) {
      parents[x] = parents[parents[x]]
      x = parents[x]
    }
    return x
  }
  const union = (a, b) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parents[rb] = ra
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (similarity(entries[i].name, entries[j].name) >= MIN_SIMILARITY) union(i, j)
    }
  }

  const groups = new Map()
  for (let i = 0; i < n; i++) {
    const root = find(i)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root).push(entries[i])
  }

  return [...groups.values()]
    .filter((g) => g.length > 1)
    .map((g) => [...g].sort((a, b) => b.freq - a.freq))
    .sort((a, b) => a.length - b.length)
}

export function DEFAULT_CANONICAL_MAP() {
  return {}
}