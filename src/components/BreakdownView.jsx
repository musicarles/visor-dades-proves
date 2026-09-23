import { useEffect, useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import { pivotByCategory, sumByName, pluralize } from '../utils/itemAnalyzer'

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2']

export default function BreakdownView({ areas, sheets, records }) {
  const [area, setArea] = useState(areas[0] || '')
  const areaRecords = useMemo(() => records.filter((r) => r.area === area), [records, area])

  const nameTotals = useMemo(() => sumByName(areaRecords), [areaRecords])
  const names = useMemo(() => [...nameTotals.keys()].sort(), [nameTotals])

  const [probe, setProbe] = useState('')

  useEffect(() => {
    if (!areas.includes(area)) setArea(areas[0] || '')
  }, [areas, area])

  useEffect(() => {
    if (!names.includes(probe)) setProbe(names[0] || '')
  }, [names, probe])

  const termCols = useMemo(() => {
    const sheet = sheets[area]
    return sheet ? sheet.headers.slice(1) : []
  }, [sheets, area])

  const filtered = useMemo(
    () => areaRecords.filter((r) => r.name === probe),
    [areaRecords, probe],
  )
  const pivoted = useMemo(() => pivotByCategory(filtered, termCols), [filtered, termCols])

  if (names.length === 0) {
    return <p className="empty">Aquesta àrea no conté proves per desglossar.</p>
  }

  const totalFreq = filtered.reduce((s, r) => s + r.count, 0)
  const max = Math.max(1, ...pivoted.flatMap((r) => termCols.map((t) => r[t] || 0)))

  return (
    <div>
      <div className="fields">
        <div className="field">
          <label htmlFor="bd-area">Àrea</label>
          <select id="bd-area" value={area} onChange={(e) => setArea(e.target.value)}>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="bd-probe">Prova</label>
          <select id="bd-probe" value={probe} onChange={(e) => setProbe(e.target.value)}>
            {names.map((n) => (
              <option key={n} value={n}>
                {n} · {nameTotals.get(n)} {pluralize(nameTotals.get(n))}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="counts">
        «{probe}» · freqüència total: {totalFreq} {pluralize(totalFreq)}
      </p>

      <div className="chart">
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={pivoted}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            {termCols.map((t, i) => (
              <Bar key={t} dataKey={t} fill={COLORS[i % COLORS.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table className="heat">
        <thead>
          <tr>
            <th>Curs</th>
            {termCols.map((t) => (
              <th key={t}>{t}</th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {pivoted.map((r) => {
            const rowTotal = termCols.reduce((s, t) => s + (r[t] || 0), 0)
            return (
              <tr key={r.category}>
                <th>{r.category}</th>
                {termCols.map((t) => {
                  const v = r[t] || 0
                  const alpha = v === 0 ? 0 : 0.2 + (v / max) * 0.7
                  return (
                    <td key={t} style={{ backgroundColor: `rgba(37, 99, 235, ${alpha})` }}>
                      {v || '·'}
                    </td>
                  )
                })}
                <td className="total">{rowTotal}</td>
              </tr>
            )
          })}
          <tr className="coltot">
            <th>Total</th>
            {termCols.map((t) => (
              <td key={t} className="total">
                {pivoted.reduce((s, r) => s + (r[t] || 0), 0)}
              </td>
            ))}
            <td className="total">{totalFreq}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}