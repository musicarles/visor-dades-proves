import { useMemo, useRef, useState } from 'react'
import { aggregateByName } from '../utils/itemAnalyzer'
import { buildSuggestionClusters, resolveName } from '../utils/unify'
import { downloadJSON } from '../utils/storage'

export default function UnifyPanel({ records, canonicalMap, onChange, omitSet = [], onToggleOmit }) {
  const fileRef = useRef(null)
  const [importMsg, setImportMsg] = useState('')

  const entries = useMemo(() => aggregateByName(records), [records])
  const clusters = useMemo(() => buildSuggestionClusters(entries), [entries])
  const omitted = useMemo(() => new Set(omitSet), [omitSet])

  const afterCount = useMemo(() => {
    const names = new Set(entries.map((e) => resolveName(e.name, canonicalMap)))
    return names.size
  }, [entries, canonicalMap])

  function setCanonical(name, canonical) {
    const next = { ...canonicalMap }
    if (canonical && canonical !== name) next[name] = canonical
    else delete next[name]
    onChange(next)
  }

  function mergeCluster(members, leader) {
    const next = { ...canonicalMap }
    for (const m of members) {
      if (m !== leader) next[m] = leader
    }
    onChange(next)
  }

  function reset() {
    if (confirm('Eliminar totes les equivalències de noms?')) onChange({})
  }

  function handleImport(e) {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result))
        if (obj && typeof obj === 'object') {
          onChange({ ...canonicalMap, ...obj })
          setImportMsg(`Importada correctament (${Object.keys(obj).length} equivalències).`)
        } else {
          setImportMsg('El fitxer no té el format esperat.')
        }
      } catch {
        setImportMsg('No s ha pogut llegir el fitxer d equivalències.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  if (entries.length === 0) {
    return <p className="empty">No hi ha proves per unificar.</p>
  }

  return (
    <div className="unify">
      <div className="uni-head">
        <p className="counts">
          {entries.length} noms diferents → {afterCount} després de la unificació
          {omitted.size > 0 && (
            <>
              {' · '}
              {omitted.size} amagades
            </>
          )}
        </p>
        <div className="uni-actions">
          <button className="small" onClick={() => downloadJSON('equivalencies.json', canonicalMap)}>
            Exporta
          </button>
          <button className="small" onClick={() => fileRef.current?.click()}>
            Importa
          </button>
          <input ref={fileRef} type="file" accept=".json" hidden onChange={handleImport} />
          <button className="small danger" onClick={reset}>
            Neteja
          </button>
        </div>
      </div>
      {importMsg && <p className="hint">{importMsg}</p>}

      {clusters.length > 0 && (
        <div className="uni-clusters">
          <h3>Suggeriments de duplicats</h3>
          {clusters.map((cluster, ci) => (
            <div key={ci} className="cluster">
              <div className="cluster-list">
                {cluster.map((e) => (
                  <span key={e.name} className="clustertag">
                    {e.name} ({e.freq})
                  </span>
                ))}
              </div>
              <button
                className="small primary"
                onClick={() => mergeCluster(cluster.map((c) => c.name), cluster[0].name)}
              >
                Fusiona a «{cluster[0].name}»
              </button>
            </div>
          ))}
        </div>
      )}

      <h3>Totes les proves ({entries.length})</h3>
      <div className="uni-list">
        {entries.map((e) => {
          const canonical = canonicalMap[e.name]
          const isOmitted = omitted.has(e.name)
          return (
            <div
              key={e.name}
              className={'uni-row' + (isOmitted ? ' omitted' : '')}
            >
              <span className="uni-name">{e.name}</span>
              <span className="uni-freq">{e.freq}</span>
              {canonical && <span className="uni-arrow">→ {canonical}</span>}
              <input
                type="text"
                placeholder={e.name}
                value={canonical || ''}
                onChange={(ev) => setCanonical(e.name, ev.target.value)}
              />
              <button
                className={'omit' + (isOmitted ? ' on' : '')}
                title={
                  isOmitted
                    ? `Torna a mostrar «${e.name}» a les vistes`
                    : `Amaga «${e.name}» de les vistes`
                }
                onClick={() => onToggleOmit(e.name)}
              >
                {isOmitted ? 'Mostra' : 'Amaga'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}