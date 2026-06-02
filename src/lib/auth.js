import { supabase } from './supabase'

export const PENDING_INVITE_KEY = 'kinsmap_pending_invite'

export function extractInviteToken(input) {
  const trimmed = input.trim()
  if (!trimmed) return ''

  const fromUrl = trimmed.match(/invite\/([0-9a-f-]{36})/i)
  if (fromUrl) return fromUrl[1]

  const uuidMatch = trimmed.match(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  )
  if (uuidMatch) return trimmed

  return trimmed
}

export function setPendingInvite(token) {
  if (token) localStorage.setItem(PENDING_INVITE_KEY, token)
}

export function getPendingInvite() {
  return localStorage.getItem(PENDING_INVITE_KEY)
}

export function clearPendingInvite() {
  localStorage.removeItem(PENDING_INVITE_KEY)
}

async function fetchTreeMembership(userId) {
  const { data, error } = await supabase
    .from('tree_members')
    .select('tree_id, role, person_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)

  if (error) throw error
  return data?.[0] ?? null
}

export async function getAuthRedirectPath(userId) {
  try {
    const membership = await fetchTreeMembership(userId)

    if (membership?.tree_id && membership?.person_id) {
      return '/tree'
    }

    if (membership?.tree_id && !membership?.person_id) {
      return '/invite/link-profile'
    }

    const pending = getPendingInvite()
    if (pending) {
      return `/invite/${pending}`
    }

    return '/onboarding'
  } catch {
    return '/onboarding'
  }
}

export { fetchTreeMembership }
