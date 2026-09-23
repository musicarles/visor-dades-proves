export default function SheetPicker({ sheets, selected, onSelect }) {
  return (
    <div className="sheetrow">
      <span className="chiplabel">Full de respostes:</span>
      {sheets.map((s) => (
        <button
          key={s.name}
          className={s.name === selected ? 'chip active' : 'chip'}
          onClick={() => onSelect(s.name)}
          title={`${s.name} — ${s.type === 'raw' ? 'formulari cru' : 'matriu'}`}
        >
          {s.name}
        </button>
      ))}
    </div>
  )
}