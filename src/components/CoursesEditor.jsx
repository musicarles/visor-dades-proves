import { DEFAULT_COURSES } from '../utils/itemAnalyzer'

export default function CoursesEditor({ courses, onChange }) {
  const text = courses.join('\n')

  function handleChange(e) {
    const list = e.target.value
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    onChange(list.length ? list : DEFAULT_COURSES)
  }

  return (
    <div className="coursesedit">
      <textarea rows={5} value={text} onChange={handleChange} spellCheck={false} />
      <button className="small" onClick={() => onChange(DEFAULT_COURSES)}>
        Restaura la llista per defecte
      </button>
    </div>
  )
}