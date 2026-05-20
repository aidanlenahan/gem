import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import PageToolbar from '../components/PageToolbar'
import { useCreateEvent } from '../hooks/useEvents'
import { useGroupTags } from '../hooks/useGroups'
import { useToast } from '../hooks/useToast'
import DurationPicker from '../components/DurationPicker'
import DateTimePicker from '../components/DateTimePicker'

type CreateEventResult = { event: { id: string } }

type PrefillState = {
  title?: string
  details?: string
  dateTime?: string
  durationMinutes?: number
  location?: string
  maxAttendees?: string
  isPrivate?: boolean
  tagIds?: string[]
}

const MAX_EVENT_TAGS = 3

export default function CreateEventPage() {
  useEffect(() => {
    document.title = 'New Event — GEM'
    return () => { document.title = 'GEM — Group Event Manager' }
  }, [])

  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { state } = useLocation()
  const prefill = (state as { prefill?: PrefillState } | null)?.prefill
  const toast = useToast()
  const createEvent = useCreateEvent()
  const { data: tagsData } = useGroupTags(groupId!)

  const [title, setTitle] = useState(prefill?.title ?? '')
  const [details, setDetails] = useState(prefill?.details ?? '')
  const [dateTime, setDateTime] = useState(prefill?.dateTime ?? '')
  const [durationMinutes, setDurationMinutes] = useState(prefill?.durationMinutes ?? 60)
  const [location, setLocation] = useState(prefill?.location ?? '')
  const [maxAttendees, setMaxAttendees] = useState(prefill?.maxAttendees ?? '')
  const [isPrivate, setIsPrivate] = useState(prefill?.isPrivate ?? false)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(prefill?.tagIds ?? [])
  const locationInputRef = useRef<HTMLInputElement>(null)
  const tags = tagsData?.tags ?? []

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
    if (!apiKey) return

    function initAutocomplete() {
      const input = locationInputRef.current
      if (!input) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = (window as any).google
      if (!g?.maps?.places) return
      const autocomplete = new g.maps.places.Autocomplete(input, { types: ['establishment', 'geocode'] })
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        setLocation(place.formatted_address || place.name || '')
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).google?.maps?.places) {
      initAutocomplete()
      return
    }

    if (document.querySelector('script[data-gmaps]')) {
      window.addEventListener('gmaps:ready', initAutocomplete, { once: true })
      return
    }

    const script = document.createElement('script')
    script.dataset.gmaps = '1'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.onload = () => {
      window.dispatchEvent(new Event('gmaps:ready'))
      initAutocomplete()
    }
    document.head.appendChild(script)
  }, [])

  if (!groupId) {
    return <div className="p-6 text-gray-400">Missing group id</div>
  }

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) => {
      if (prev.includes(tagId)) {
        return prev.filter((id) => id !== tagId)
      }
      if (prev.length >= MAX_EVENT_TAGS) {
        toast.error(`You can add up to ${MAX_EVENT_TAGS} tags per event`)
        return prev
      }
      return [...prev, tagId]
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = (await createEvent.mutateAsync({
        groupId,
        title,
        details: details || undefined,
        dateTime: new Date(dateTime).toISOString(),
        endsAt: dateTime ? new Date(new Date(dateTime).getTime() + durationMinutes * 60000).toISOString() : undefined,
        location: location || undefined,
        maxAttendees: maxAttendees ? Number(maxAttendees) : undefined,
        isPrivate,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      })) as CreateEventResult
      toast.success('Event created!')
      navigate(`/events/${result.event.id}`)
    } catch {
      toast.error('Failed to create event')
    }
  }

  return (
    <div className="px-4 py-6 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">{prefill ? 'Duplicate Event' : 'Create Event'}</h2>
        <PageToolbar />
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={100}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Details</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={4}
            maxLength={3000}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Start Date/Time *</label>
            <DateTimePicker
              value={dateTime}
              onChange={setDateTime}
              required
              disabled={createEvent.isPending}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Duration</label>
            <DurationPicker
              durationMinutes={durationMinutes}
              onChange={setDurationMinutes}
              disabled={createEvent.isPending}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Location</label>
          <input
            ref={locationInputRef}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Central Park"
            maxLength={200}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Max Attendees</label>
          <input
            type="number"
            value={maxAttendees}
            onChange={(e) => setMaxAttendees(e.target.value)}
            min="1"
            placeholder="No limit"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isPrivate"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="isPrivate" className="text-sm text-gray-300">
            Private event (invite-only)
          </label>
        </div>

        {tags.length > 0 && (
          <div>
            <label className="block text-sm text-gray-400 mb-2">Tags ({selectedTagIds.length}/{MAX_EVENT_TAGS})</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedTagIds.includes(tag.id)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-3 text-gray-400 hover:text-white text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createEvent.isPending}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            {createEvent.isPending ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  )
}
