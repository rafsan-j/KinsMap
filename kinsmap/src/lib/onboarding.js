import { supabase } from './supabase'

export async function createTreeWithOwnerProfile({ userId, treeName, personRow }) {
  const { data: tree, error: treeError } = await supabase
    .from('trees')
    .insert({ name: treeName.trim(), created_by: userId })
    .select('id, name')
    .single()

  if (treeError) throw treeError

  const personId = personRow.id || crypto.randomUUID()
  const { data: person, error: personError } = await supabase
    .from('persons')
    .insert({
      ...personRow,
      id: personId,
      tree_id: tree.id,
      created_by: userId,
    })
    .select()
    .single()

  if (personError) throw personError

  const { data: members, error: memberFetchError } = await supabase
    .from('tree_members')
    .select('id')
    .eq('tree_id', tree.id)
    .eq('user_id', userId)
    .limit(1)

  if (memberFetchError) throw memberFetchError

  const member = members?.[0]

  if (member) {
    const { error: updateError } = await supabase
      .from('tree_members')
      .update({ person_id: person.id })
      .eq('id', member.id)

    if (updateError) throw updateError
  } else {
    const { error: insertError } = await supabase.from('tree_members').insert({
      tree_id: tree.id,
      user_id: userId,
      person_id: person.id,
      role: 'owner',
    })

    if (insertError) throw insertError
  }

  return { tree, person, role: 'owner' }
}
