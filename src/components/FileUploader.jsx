import { useRef, useState } from 'react'

export default function FileUploader({ onFile }) {
  const inputRef = useRef(null)
  const [error, setError] = useState(null)
  const [dragging, setDragging] = useState(false)

  function handleFile(file) {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setError('Format no vàlid. Trieu un fitxer .xlsx o .csv.')
      return
    }
    setError(null)
    onFile(file)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div
      className={`dropzone${dragging ? ' dragging' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        hidden
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <p className="dropzone-title">Arrossega aquí un full de càlcul</p>
      <p className="dropzone-subtitle">o fes clic per triar un fitxer (.xlsx / .csv)</p>
      {error && <p className="dropzone-error">{error}</p>}
    </div>
  )
}