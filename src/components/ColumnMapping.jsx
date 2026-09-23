import { indexToLetter } from '../utils/itemAnalyzer'

function letterIndex(letter) {
  let n = 0
  for (const c of String(letter).toUpperCase()) n = n * 26 + (c.charCodeAt(0) - 64)
  return n - 1
}

export default function ColumnMapping({ sheet, columns, onChange }) {
  if (!sheet) return null

  const widthFromAoa = sheet.aoa.reduce((m, r) => Math.max(m, r ? r.length : 0), 0)
  const widthFromMap = Object.keys(columns).reduce((m, l) => Math.max(m, letterIndex(l) + 1), 0)
  const maxCols = Math.max(widthFromAoa, widthFromMap, 3)

  const rows = []
  for (let i = 0; i < maxCols; i++) {
    const header = sheet.aoa[0] ? String(sheet.aoa[0][i] ?? '') : ''
    const first = sheet.aoa.length > 1 ? String(sheet.aoa[1][i] ?? '') : ''
    rows.push({ letter: indexToLetter(i), header, first })
  }

  function setColumn(letter, name) {
    const next = { ...columns }
    if (name.trim()) next[letter] = name.trim()
    else delete next[letter]
    onChange(next)
  }

  return (
    <div className="columnmap">
      {rows.map(({ letter, header, first }) => (
        <div key={letter} className="maprow">
          <span className="mapletter">{letter}</span>
          <span className="mappreview">
            {header || first ? `${header}${first && !header ? ' · ' + first : ''}` : '(buit)'}
          </span>
          <input
            type="text"
            placeholder="Ignorar"
            value={columns[letter] || ''}
            onChange={(e) => setColumn(letter, e.target.value)}
          />
        </div>
      ))}
      <p className="hint">
        Escriu el nom de l àrea que correspon a cada columna (ex. Català/castellà). Deixa-ho
        buit per ignorar-la. Per defecte: D-i-G amb els noms que t agradin.
      </p>
    </div>
  )
}