export default function InviteSetupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Complete Your Setup</h1>
        <p className="mt-3 text-sm text-gray-600">
          Your account is signed in but not yet linked to a family tree. Use the
          invitation link from your family admin to join a tree, or contact them to
          send a new invite.
        </p>
      </div>
    </div>
  )
}
