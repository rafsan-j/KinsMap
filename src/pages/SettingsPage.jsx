import { useAuth } from '../hooks/useAuth'
import MembersPanel from '../components/layout/MembersPanel'

export default function SettingsPage() {
  const { userRole } = useAuth()

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-xl font-bold text-gray-900">Settings</h1>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Members</h2>
        <p className="mb-6 text-sm text-gray-600">
          Invite family members and manage their access to this tree.
          {userRole === 'owner' && ' As owner, you can change member roles.'}
        </p>
        <MembersPanel />
      </section>
    </div>
  )
}
