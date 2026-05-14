// Snaps a datetime-local string value (YYYY-MM-DDTHH:mm) to the nearest
// 15-minute boundary. Used so all event start-time pickers stay on the
// :00 / :15 / :30 / :45 grid regardless of how the value was entered.
export function snapTo15Min(value: string): string {
  if (!value) return value
  const tIdx = value.indexOf('T')
  if (tIdx === -1) return value
  const datePart = value.slice(0, tIdx)
  const [h, m] = value.slice(tIdx + 1).split(':').map(Number)
  const snapped = Math.round(m / 15) * 15
  const totalMin = h * 60 + snapped
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${datePart}T${pad(Math.floor(totalMin / 60) % 24)}:${pad(totalMin % 60)}`
}

// Valid minute options for event time pickers — kept in sync with the
// step="900" (15 min) constraint on <input type="datetime-local">.
export const MINUTE_OPTIONS = [0, 15, 30, 45] as const
