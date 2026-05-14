import { useMemo } from 'react'

interface Props {
  value: string        // YYYY-MM-DDTHH:mm
  onChange: (value: string) => void
  required?: boolean
  disabled?: boolean
  className?: string
}

const MINUTES = ['00', '15', '30', '45']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function formatHour(h: number) {
  const period = h < 12 ? 'AM' : 'PM'
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display}:00 ${period}`
}

export default function DateTimePicker({ value, onChange, required, disabled, className }: Props) {
  const { datePart, hour, minute } = useMemo(() => {
    if (!value || !value.includes('T')) return { datePart: '', hour: 9, minute: 0 }
    const [d, t] = value.split('T')
    const [h, m] = t.split(':').map(Number)
    // Snap minute to nearest valid option
    const snapped = [0, 15, 30, 45].reduce((prev, curr) =>
      Math.abs(curr - m) < Math.abs(prev - m) ? curr : prev
    )
    return { datePart: d, hour: h, minute: snapped }
  }, [value])

  const emit = (d: string, h: number, m: number) => {
    if (!d) return
    onChange(`${d}T${pad(h)}:${pad(m)}`)
  }

  const inputClass =
    'bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50'

  return (
    <div className={`flex gap-2 ${className ?? ''}`}>
      <input
        type="date"
        required={required}
        disabled={disabled}
        value={datePart}
        onChange={(e) => emit(e.target.value, hour, minute)}
        className={`${inputClass} flex-1 min-w-0 px-3 py-3 text-sm`}
      />
      <select
        disabled={disabled}
        value={hour}
        onChange={(e) => emit(datePart, Number(e.target.value), minute)}
        className={`${inputClass} px-2 py-3 text-sm`}
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {formatHour(h)}
          </option>
        ))}
      </select>
      <select
        disabled={disabled}
        value={minute}
        onChange={(e) => emit(datePart, hour, Number(e.target.value))}
        className={`${inputClass} px-2 py-3 text-sm`}
      >
        {MINUTES.map((m) => (
          <option key={m} value={Number(m)}>
            :{m}
          </option>
        ))}
      </select>
    </div>
  )
}
