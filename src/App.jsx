import { useEffect, useMemo, useState } from 'react'
import FileUploader from './components/FileUploader'
import FreqView from './components/FreqView'
import AreaView from './components/AreaView'
import BreakdownView from './components/BreakdownView'
import SheetPicker from './components/SheetPicker'
import ColumnMapping from './components/ColumnMapping'
import CoursesEditor from './components/CoursesEditor'
import UnifyPanel from './components/UnifyPanel'
import { parseSpreadsheet } from './utils/parseSpreadsheet'
import {
  DEFAULT_COURSES,
  detectSheetType,
  sheetToRecords,
} from './utils/itemAnalyzer'
import { applyCanonical } from './utils/unify'
import { loadJSON, saveJSON, LS_CANONICAL, LS_COURSES, LS_COLUMNS, LS_OMIT } from './utils/storage'

const VIEWS = [
  { id: 'global', label: 'Visió global' },
  { id: 'area', label: 'Per àrea' },
  { id: 'breakdown', label: 'Per curs i trimestre' },
  { id: 'config', label: 'Configuració' },
]

const DEFAULT_MAP = {
  D: 'Català/castellà',
  E: 'Anglès',
  F: 'Matemàtiques',
  G: 'Ciències',
}

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sheetName, setSheetName] = useState(null)
  const [view, setView] = useState('global')
  const [columnMap, setColumnMap] = useState(() => loadJSON(LS_COLUMNS, {}))
  const [courses, setCourses] = useState(() => loadJSON(LS_COURSES, null) || DEFAULT_COURSES)
  const [canonicalMap, setCanonicalMap] = useState(() => loadJSON(LS_CANONICAL, {}))
  const [omitSet, setOmitSet] = useState(() => loadJSON(LS_OMIT, []))

  useEffect(() => saveJSON(LS_COLUMNS, columnMap), [columnMap])
  useEffect(() => saveJSON(LS_COURSES, courses), [courses])
  useEffect(() => saveJSON(LS_CANONICAL, canonicalMap), [canonicalMap])
  useEffect(() => saveJSON(LS_OMIT, omitSet), [omitSet])

  async function handleFile(file) {
    setLoading(true)
    setError(null)
    setData(null)
    setSheetName(null)
    try {
      const parsed = await parseSpreadsheet(file)
      setData(parsed)
      if (Object.keys(columnMap).length === 0) setColumnMap({ ...DEFAULT_MAP })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!data) {
      setSheetName(null)
      return
    }
    const names = data.sheetNames
    const prefer = names.find((n) => /respostes|formulari/i.test(n))
    const raw = names.find((n) => detectSheetType(data.sheets[n]) === 'raw')
    setSheetName(prefer || raw || names[0])
  }, [data])

  const sheet = useMemo(() => {
    if (!data || !sheetName) return null
    const s = data.sheets[sheetName]
    return s ? { ...s, type: detectSheetType(s) } : null
  }, [data, sheetName])

  const rawRecords = useMemo(() => {
    if (!sheet) return []
    return sheetToRecords(sheet, { columnMap, courses })
  }, [sheet, columnMap, courses])

  const records = useMemo(
    () => applyCanonical(rawRecords.filter((r) => !omitSet.includes(r.prove)), canonicalMap),
    [rawRecords, canonicalMap, omitSet],
  )

  function toggleOmit(name) {
    setOmitSet((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    )
  }

  return (
    <div className="app">
      <header>
        <h1>Visor de Dades</h1>
        <p>Puja el full de respostes del Google Forms i analitza les proves.</p>
      </header>

      <FileUploader onFile={handleFile} />

      {loading && <p className="status">Llegint el fitxer...</p>}
      {error && <p className="status error">{error}</p>}

      {data && sheet && (
        <main>
          <div className="bar">
            <span className="pill">
              {data.fileName} · {sheetName} ·{' '}
              {sheet.type === 'raw' ? 'formulari cru' : 'matriu'} · {records.length} registres
            </span>
            <button className="reset" onClick={() => setData(null)}>
              Canviar fitxer
            </button>
          </div>

          {data.sheetNames.length > 1 && (
            <SheetPicker
              sheets={data.sheetNames.map((n) => ({ name: n, type: detectSheetType(data.sheets[n]) }))}
              selected={sheetName}
              onSelect={setSheetName}
            />
          )}

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

          {view === 'global' && <FreqView records={records} />}
          {view === 'area' && <AreaView records={records} courseList={courses} />}
          {view === 'breakdown' && (
            <BreakdownView records={records} courseList={courses} />
          )}

          {view === 'config' && (
            <section className="config">
              <h2>Configuració</h2>

              <h3>Columnes → àrees</h3>
              <p className="hint">
                Marca quines columnes del formulari són àrees i com es diuen. El que queda buit
                s ignora.
              </p>
              <ColumnMapping sheet={sheet} columns={columnMap} onChange={setColumnMap} />

              <h3>Llista de cursos</h3>
              <p className="hint">
                S usen per expandir rangs com «1r a 6è» o «I3-I5». Un curs per línia.
              </p>
              <CoursesEditor courses={courses} onChange={setCourses} />

              <h3>Unificar noms de proves</h3>
              <p className="hint">
                Fusiona variacions del mateix nom. S aplica a totes les vistes i es guarda al
                navegador.
              </p>
              <UnifyPanel
                records={rawRecords}
                canonicalMap={canonicalMap}
                onChange={setCanonicalMap}
                omitSet={omitSet}
                onToggleOmit={toggleOmit}
              />
            </section>
          )}
        </main>
      )}
    </div>
  )
}