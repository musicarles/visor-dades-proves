import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import { aggregateByName } from '../utils/itemAnalyzer'

const TOP = 20

export default function FreqView({ records, emptyText = 'No hi ha prove per mostrar.' }) {
  const agg = useMemo(() => aggregateByName(records), [records])
  const total = useMemo(() => records.reduce((s, r) => s + r.count, 0), [records])

  if (agg.length === 0) {
    return <p className="empty">{emptyText}</p>
  }

  const top = agg.slice(0, TOP)

  return (
    <div className="freq">
      <p className="counts">
        {agg.length} proves diferents · {total} mencions
      </p>

      <div className="chart">
        <ResponsiveContainer width="100%" height={Math.max(260, TOP * 26)}>
          <BarChart layout="vertical" data={top} margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={230} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [`${v}`, 'Freqüència']} />
            <Bar dataKey="freq" fill="#2563eb" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table className="tbl">
        <thead>
          <tr>
            <th>Prova</th>
            <th>Freqüència</th>
          </tr>
        </thead>
        <tbody>
          {agg.map((a) => (
            <tr key={a.name}>
              <td>{a.name}</td>
              <td>{a.freq}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}