import { supabase } from './supabase'

export async function createTreeWithOwnerProfile({ treeName, personRow }) {
  const { data, error } = await supabase.rpc('create_tree_and_owner', {
    p_tree_name: treeName,
    p_first_name: personRow.first_name,
    p_last_name: personRow.last_name,
    p_gender: personRow.gender,
    p_birth_date: personRow.birth_date || null,
    p_phone: personRow.phone,
    p_city: personRow.city,
    p_country: personRow.country,
    p_nickname: personRow.nickname,
  })

  if (error) throw error

  return { data, error: null }
}
