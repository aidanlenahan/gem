import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import PageToolbar from '../components/PageToolbar'
import Spinner from '../components/Spinner'
import Avatar from '../components/Avatar'
import { useGroup } from '../hooks/useGroups'

interface GroupStats {
  totalEvents: number
  totalMembers: number
  totalMessages: number
  totalMedia: number
  storageBytes: number
  rsvpByStatus: Record<string, number>
  topMembers: { userId: string; name: string; username: string | null; avatarUrl: string | null; rsvpYesCount: number }[]
  topTags: { tagId: string; name: string; color: string | null; eventCount: number }[]
}

function fmtBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-100">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function GroupStatsPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const { data: groupData } = useGroup(groupId!)

  const { data, isLoading, isError, refetch } = useQuery<GroupStats>({
    queryKey: ['groups', groupId, 'stats'],
    queryFn: () => apiFetch(`/groups/${groupId}/stats`),
    staleTime: 60_000,
  })

  const totalRsvps = data ? Object.values(data.rsvpByStatus).reduce((a, b) => a + b, 0) : 0

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <PageToolbar
        title={groupData?.group?.name ? `${groupData.group.name} — Stats` : 'Group Stats'}
        backTo={`/groups/${groupId}/manage`}
      />

      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <Spinner />
        </div>
      )}

      {isError && (
        <div className="text-center py-24">
          <p className="text-gray-400 mb-4">Failed to load stats.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {data && (
        <div className="space-y-8 mt-2">
          {/* Overview grid */}
          <section>
            <h2 className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-3">Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Events" value={data.totalEvents} />
              <StatCard label="Members" value={data.totalMembers} />
              <StatCard label="Messages" value={data.totalMessages} />
              <StatCard label="Photos" value={data.totalMedia} sub={fmtBytes(data.storageBytes)} />
            </div>
          </section>

          {/* RSVPs */}
          <section>
            <h2 className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-3">RSVPs — {totalRsvps} total</h2>
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="Going"
                value={data.rsvpByStatus['yes'] ?? 0}
                sub={totalRsvps > 0 ? `${Math.round(((data.rsvpByStatus['yes'] ?? 0) / totalRsvps) * 100)}%` : undefined}
              />
              <StatCard
                label="Maybe"
                value={data.rsvpByStatus['maybe'] ?? 0}
                sub={totalRsvps > 0 ? `${Math.round(((data.rsvpByStatus['maybe'] ?? 0) / totalRsvps) * 100)}%` : undefined}
              />
              <StatCard
                label="Not going"
                value={data.rsvpByStatus['no'] ?? 0}
                sub={totalRsvps > 0 ? `${Math.round(((data.rsvpByStatus['no'] ?? 0) / totalRsvps) * 100)}%` : undefined}
              />
            </div>
          </section>

          {/* Top members */}
          <section>
            <h2 className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-3">Most active members</h2>
            {data.topMembers.length === 0 ? (
              <p className="text-sm text-gray-500">No RSVPs yet.</p>
            ) : (
              <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl divide-y divide-gray-700/40">
                {data.topMembers.map((m, i) => (
                  <Link
                    key={m.userId}
                    to={m.username ? `/u/${m.username}` : '#'}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/40 transition-colors first:rounded-t-xl last:rounded-b-xl"
                  >
                    <span className="text-sm font-bold text-gray-500 w-5 text-center">{i + 1}</span>
                    <Avatar name={m.name} avatarUrl={m.avatarUrl} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{m.name}</p>
                      {m.username && <p className="text-xs text-gray-500">@{m.username}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-indigo-400">{m.rsvpYesCount}</p>
                      <p className="text-xs text-gray-500">going</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Top tags */}
          {data.topTags.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-3">Top tags</h2>
              <div className="flex flex-wrap gap-2">
                {data.topTags.map((t) => (
                  <div
                    key={t.tagId}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium"
                    style={t.color ? { borderColor: `${t.color}40`, backgroundColor: `${t.color}18`, color: t.color } : {}}
                  >
                    {t.name}
                    <span className="text-xs opacity-60 font-normal">× {t.eventCount}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
