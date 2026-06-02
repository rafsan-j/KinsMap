import { useCallback, useEffect, useState } from 'react'
import { Copy, Trash2, UserPlus } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { usePersons } from '../../hooks/usePersons'
import {
  buildInviteUrl,
  createInvite,
  fetchPendingInvites,
  fetchTreeMembers,
  revokeInvite,
  updateMemberRole,
} from '../../lib/invites'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import Select from '../ui/Select'
import Spinner from '../ui/Spinner'

const ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'contributor', label: 'Contributor' },
  { value: 'viewer', label: 'Viewer' },
]

const INVITE_ROLE_OPTIONS = [
  { value: 'contributor', label: 'Contributor' },
  { value: 'viewer', label: 'Viewer' },
]

const ROLE_VARIANTS = {
  owner: 'primary',
  admin: 'primary',
  contributor: 'success',
  viewer: 'muted',
}

function getPersonName(persons, personId) {
  if (!personId || !persons[personId]) return 'Not linked'
  const person = persons[personId]
  return [person.first_name, person.last_name].filter(Boolean).join(' ') || 'Unnamed'
}

export default function MembersPanel() {
  const { currentUser, treeId, userRole } = useAuth()
  const { persons, fetchPersons } = usePersons()

  const [members, setMembers] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inviteRole, setInviteRole] = useState('viewer')
  const [creating, setCreating] = useState(false)
  const [copiedToken, setCopiedToken] = useState(null)

  const canManage = userRole === 'owner' || userRole === 'admin'
  const canChangeRoles = userRole === 'owner'

  const loadData = useCallback(async () => {
    if (!treeId) return

    setLoading(true)
    setError('')

    const [membersResult, invitesResult] = await Promise.all([
      fetchTreeMembers(treeId),
      canManage ? fetchPendingInvites(treeId) : Promise.resolve({ data: [], error: null }),
    ])

    if (membersResult.error) setError(membersResult.error)
    else setMembers(membersResult.data ?? [])

    if (invitesResult.error) setError(invitesResult.error)
    else setPendingInvites(invitesResult.data ?? [])

    setLoading(false)
  }, [treeId, canManage])

  useEffect(() => {
    if (treeId) {
      fetchPersons(treeId)
      loadData()
    }
  }, [treeId, fetchPersons, loadData])

  const handleCreateInvite = async () => {
    if (!treeId || !currentUser?.id) return

    setCreating(true)
    setError('')

    const { data, error: createError } = await createInvite(
      treeId,
      inviteRole,
      currentUser.id,
    )

    setCreating(false)

    if (createError) {
      setError(createError)
      return
    }

    if (data) {
      setPendingInvites((prev) => [data, ...prev])
    }
  }

  const handleCopyLink = async (token) => {
    const url = buildInviteUrl(token)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 2000)
    } catch {
      setError('Could not copy to clipboard')
    }
  }

  const handleRevokeInvite = async (inviteId) => {
    const { error: revokeError } = await revokeInvite(inviteId)
    if (revokeError) {
      setError(revokeError)
      return
    }
    setPendingInvites((prev) => prev.filter((invite) => invite.id !== inviteId))
  }

  const handleRoleChange = async (memberId, role) => {
    const { error: updateError } = await updateMemberRole(memberId, role)
    if (updateError) {
      setError(updateError)
      return
    }
    setMembers((prev) =>
      prev.map((member) => (member.id === memberId ? { ...member, role } : member)),
    )
  }

  if (!canManage) {
    return (
      <p className="text-sm text-gray-600">
        Only tree owners and admins can manage members.
      </p>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <section>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Create Invite Link</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Select
              label="Role for invitee"
              value={inviteRole}
              onChange={setInviteRole}
              options={INVITE_ROLE_OPTIONS}
            />
          </div>
          <Button
            type="button"
            onClick={handleCreateInvite}
            disabled={creating}
            className="shrink-0"
          >
            <UserPlus className="mr-1.5 h-4 w-4" />
            {creating ? 'Creating…' : 'Create Invite Link'}
          </Button>
        </div>
      </section>

      {pendingInvites.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Pending Invites</h3>
          <ul className="space-y-2">
            {pendingInvites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <Badge variant={ROLE_VARIANTS[invite.role] ?? 'muted'}>
                    {invite.role}
                  </Badge>
                  <p className="mt-1 text-xs text-gray-500">
                    Expires {new Date(invite.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => handleCopyLink(invite.token)}
                  >
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    {copiedToken === invite.token ? 'Copied!' : 'Copy Link'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => handleRevokeInvite(invite.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Revoke
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Members</h3>
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {members.map((member) => {
            const isSelf = member.user_id === currentUser?.id
            const linkedName = getPersonName(persons, member.person_id)

            return (
              <li
                key={member.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {linkedName}
                    {isSelf && (
                      <span className="ml-2 text-xs text-gray-500">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {member.person_id ? 'Profile linked' : 'Profile not linked yet'}
                  </p>
                </div>

                {canChangeRoles && member.role !== 'owner' ? (
                  <div className="w-full sm:w-40">
                    <Select
                      value={member.role}
                      onChange={(role) => handleRoleChange(member.id, role)}
                      options={ROLE_OPTIONS.filter((option) => option.value !== 'owner')}
                      disabled={isSelf}
                    />
                  </div>
                ) : (
                  <Badge variant={ROLE_VARIANTS[member.role] ?? 'muted'}>
                    {member.role}
                  </Badge>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
