import { useEffect, useMemo, useState } from 'react'
import FreqView from './FreqView'

export default function AreaView({ areas, records }) {
  const [area, setArea] = useState(areas[0] || '')

  useEffect(() => {
    if (!areas.includes(area)) setArea(areas[0] || '')
  }, [areas, area])

  const filtered = useMemo(() => records.filter((r) => r.area === area), [records, area])

  return (
    <div>
      <div className="field">
        <label htmlFor="area-select">Àrea</label>
        <select id="area-select" value={area} onChange={(e) => setArea(e.target.value)}>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <FreqView records={filtered} emptyText="Aquesta àrea no conté proves per mostrar." />
    </div>
  )
}