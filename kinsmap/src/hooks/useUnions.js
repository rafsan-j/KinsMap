import { supabase } from '../lib/supabase'

export async function fetchUnions(treeId) {
  try {
    const { data, error } = await supabase
      .from('unions')
      .select('*')
      .eq('tree_id', treeId)
      .eq('is_deleted', false)

    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (error) {
    return { data: null, error: error.message ?? 'Unknown error' }
  }
}

export function useUnions() {
  return { fetchUnions }
}
