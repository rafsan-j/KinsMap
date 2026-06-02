import { supabase } from './supabase'

export async function validateInviteToken(token) {
  try {
    const { data, error } = await supabase.rpc('get_invite_by_token', {
      invite_token: token,
    })

    if (error) throw error

    const invite = Array.isArray(data) ? data[0] : data
    if (!invite) {
      return { data: null, error: 'Invite not found' }
    }

    if (!invite.is_valid) {
      return { data: null, error: 'This invite has expired or already been used' }
    }

    return {
      data: {
        id: invite.invite_id,
        treeId: invite.tree_id,
        treeName: invite.tree_name,
        role: invite.role,
        expiresAt: invite.expires_at,
      },
      error: null,
    }
  } catch (error) {
    return { data: null, error: error.message ?? 'Failed to validate invite' }
  }
}

export async function acceptInvite(token) {
  try {
    const { data, error } = await supabase.rpc('accept_invite', {
      invite_token: token,
    })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error.message ?? 'Failed to accept invite' }
  }
}

export async function createInvite(treeId, role, createdBy) {
  try {
    const { data, error } = await supabase
      .from('invites')
      .insert({
        tree_id: treeId,
        role,
        created_by: createdBy,
      })
      .select('id, token, role, expires_at, is_used, created_at')
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error.message ?? 'Failed to create invite' }
  }
}

export async function fetchPendingInvites(treeId) {
  try {
    const { data, error } = await supabase
      .from('invites')
      .select('id, token, role, expires_at, is_used, created_at')
      .eq('tree_id', treeId)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (error) {
    return { data: null, error: error.message ?? 'Failed to fetch invites' }
  }
}

export async function revokeInvite(inviteId) {
  try {
    const { error } = await supabase.from('invites').delete().eq('id', inviteId)

    if (error) throw error
    return { data: true, error: null }
  } catch (error) {
    return { data: null, error: error.message ?? 'Failed to revoke invite' }
  }
}

export function buildInviteUrl(token) {
  return `${window.location.origin}/invite/${token}`
}

export async function fetchTreeMembers(treeId) {
  try {
    const { data, error } = await supabase
      .from('tree_members')
      .select('id, user_id, person_id, role, created_at')
      .eq('tree_id', treeId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (error) {
    return { data: null, error: error.message ?? 'Failed to fetch members' }
  }
}

export async function updateMemberRole(memberId, role) {
  try {
    const { data, error } = await supabase
      .from('tree_members')
      .update({ role })
      .eq('id', memberId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error.message ?? 'Failed to update role' }
  }
}

export async function linkMemberPerson(memberId, personId) {
  try {
    const { data, error } = await supabase
      .from('tree_members')
      .update({ person_id: personId })
      .eq('id', memberId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error.message ?? 'Failed to link profile' }
  }
}

export async function searchPersonsByName(treeId, query) {
  try {
    const trimmed = query.trim()
    if (!trimmed) return { data: [], error: null }

    const { data, error } = await supabase
      .from('persons')
      .select('id, first_name, last_name, nickname, gender, birth_date, profile_picture_url')
      .eq('tree_id', treeId)
      .eq('is_deleted', false)
      .or(
        `first_name.ilike.%${trimmed}%,last_name.ilike.%${trimmed}%,nickname.ilike.%${trimmed}%`,
      )
      .limit(20)

    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (error) {
    return { data: null, error: error.message ?? 'Search failed' }
  }
}
