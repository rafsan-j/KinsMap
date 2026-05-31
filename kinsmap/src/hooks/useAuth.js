import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { fetchTreeMembership } from '../lib/auth'

async function syncAuthSession(session) {
  const { setAuthState, clearAuth, setLoading } = useAuthStore.getState()

  if (!session?.user) {
    clearAuth()
    return
  }

  setLoading(true)

  try {
    const membership = await fetchTreeMembership(session.user.id)

    setAuthState({
      user: session.user,
      role: membership?.role ?? null,
      linkedPersonId: membership?.person_id ?? null,
      treeId: membership?.tree_id ?? null,
      isLoading: false,
    })
  } catch {
    setAuthState({
      user: session.user,
      role: null,
      linkedPersonId: null,
      treeId: null,
      isLoading: false,
    })
  }
}

export function AuthProvider({ children }) {
  useEffect(() => {
    let mounted = true

    async function initSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (mounted) {
        await syncAuthSession(session)
      }
    }

    initSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        await syncAuthSession(session)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return children
}

export async function refreshAuthSession(user) {
  await syncAuthSession({ user })
}

export { getAuthRedirectPath } from '../lib/auth'

export function useAuth() {
  const user = useAuthStore((state) => state.user)
  const role = useAuthStore((state) => state.role)
  const linkedPersonId = useAuthStore((state) => state.linkedPersonId)
  const treeId = useAuthStore((state) => state.treeId)
  const isLoading = useAuthStore((state) => state.isLoading)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const setAuth = useAuthStore((state) => state.setAuth)

  const signOut = async () => {
    await supabase.auth.signOut()
    clearAuth()
  }

  const refreshMembership = async () => {
    if (!user?.id) return
    await syncAuthSession({ user })
  }

  return {
    user,
    treeId,
    role,
    linkedPersonId,
    isLoading,
    isAuthenticated: Boolean(user),
    signOut,
    refreshMembership,
    setAuth,
    currentUser: user,
    userRole: role,
  }
}
