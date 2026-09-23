import { useMemo, useState } from 'react'
import FileUploader from './components/FileUploader'
import FreqView from './components/FreqView'
import AreaView from './components/AreaView'
import BreakdownView from './components/BreakdownView'
import { parseSpreadsheet } from './utils/parseSpreadsheet'
import { extractRecords } from './utils/itemAnalyzer'

const VIEWS = [
  { id: 'global', label: 'Visió global' },
  { id: 'area', label: 'Per àrea' },
  { id: 'breakdown', label: 'Per curs i trimestre' },
]

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('global')
  const [areas, setAreas] = useState([])

  async function handleFile(file) {
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const parsed = await parseSpreadsheet(file)
      setData(parsed)
      setAreas(parsed.sheetNames)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function toggleArea(name) {
    setAreas((cur) =>
      cur.includes(name) ? cur.filter((a) => a !== name) : [...cur, name],
    )
  }

  const allRecords = useMemo(
    () => (data ? extractRecords(data.sheets) : []),
    [data],
  )

  const selectedRecords = useMemo(
    () => allRecords.filter((r) => areas.includes(r.area)),
    [allRecords, areas],
  )

  return (
    <div className="app">
      <header>
        <h1>Visor de Dades</h1>
        <p>Puja un full de càlcul i analitza les proves que s hi recullen.</p>
      </header>

      <FileUploader onFile={handleFile} />

      {loading && <p className="status">Llegint el fitxer...</p>}
      {error && <p className="status error">{error}</p>}

      {data && (
        <main>
          <div className="bar">
            <span className="pill">
              {data.fileName} · {data.sheetNames.length} àrees ·{' '}
              {allRecords.length} mencions de proves
            </span>
            <button className="reset" onClick={() => setData(null)}>
              Canviar fitxer
            </button>
          </div>

          <div className="viewtabs">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                className={v.id === view ? 'viewtab active' : 'viewtab'}
                onClick={() => setView(v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>

          {view === 'global' && (
            <div className="chiprow">
              <span className="chiplabel">Àrees analitzades:</span>
              {data.sheetNames.map((name) => (
                <button
                  key={name}
                  className={areas.includes(name) ? 'chip active' : 'chip'}
                  onClick={() => toggleArea(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          {view === 'global' && (
            <FreqView
              records={selectedRecords}
              emptyText="Selecciona almenys una àrea per veure l anàlisi global."
            />
          )}
          {view === 'area' && (
            <AreaView
              key={data.fileName}
              areas={data.sheetNames}
              records={allRecords}
            />
          )}
          {view === 'breakdown' && (
            <BreakdownView
              key={data.fileName}
              areas={data.sheetNames}
              sheets={data.sheets}
              records={allRecords}
            />
          )}
        </main>
      )}
    </div>
  )
}