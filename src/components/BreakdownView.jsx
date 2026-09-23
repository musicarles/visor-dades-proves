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
import { aggregateByName, distinctAreas, pluralize, pivotByCourseTerm, TERM_LABELS } from '../utils/itemAnalyzer'

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2']
const TERM_KEYS = [1, 2, 3]

export default function BreakdownView({ records, courseList }) {
  const { areas, courses } = useMemo(
    () => distinctAreas(records, courseList),
    [records, courseList],
  )
  const [area, setArea] = useState(areas[0] || '')
  const [probe, setProbe] = useState('')

  const areaRecords = useMemo(() => records.filter((r) => r.area === area), [records, area])
  const entries = useMemo(() => aggregateByName(areaRecords), [areaRecords])
  const names = useMemo(() => entries.map((e) => e.name), [entries])
  const freqByName = useMemo(() => new Map(entries.map((e) => [e.name, e.freq])), [entries])

  useEffect(() => {
    if (!areas.includes(area)) setArea(areas[0] || '')
  }, [areas, area])

  useEffect(() => {
    if (!names.includes(probe)) setProbe(names[0] || '')
  }, [names, probe])

  const { rows: pivoted } = useMemo(
    () => pivotByCourseTerm(areaRecords.filter((r) => r.prove === probe), TERM_KEYS),
    [areaRecords, probe],
  )

  const ordered = useMemo(() => {
    const first = courses.filter((c) => pivoted.some((r) => r.course === c))
    const rest = pivoted.filter((r) => !courses.includes(r.course))
    return [...first.map((c) => pivoted.find((r) => r.course === c)), ...rest]
  }, [courses, pivoted])

  if (names.length === 0) {
    return <p className="empty">Aquesta àrea no conté proves per desglossar.</p>
  }

  const totalFreq = areaRecords.filter((r) => r.prove === probe).reduce((s, r) => s + r.count, 0)
  const max = Math.max(1, ...ordered.flatMap((r) => TERM_KEYS.map((t) => r[t] || 0)))

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
                {n} · {freqByName.get(n)} {pluralize(freqByName.get(n))}
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
          <BarChart data={ordered}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="course" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            {TERM_KEYS.map((t, i) => (
              <Bar key={t} dataKey={t} name={TERM_LABELS[t - 1]} fill={COLORS[i % COLORS.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table className="heat">
        <thead>
          <tr>
            <th>Curs</th>
            {TERM_LABELS.map((t) => (
              <th key={t}>{t}</th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((r) => {
            const rowTotal = TERM_KEYS.reduce((s, t) => s + (r[t] || 0), 0)
            return (
              <tr key={r.course}>
                <th>{r.course}</th>
                {TERM_KEYS.map((t) => {
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
            {TERM_KEYS.map((t) => (
              <td key={t} className="total">
                {ordered.reduce((s, r) => s + (r[t] || 0), 0)}
              </td>
            ))}
            <td className="total">{totalFreq}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}