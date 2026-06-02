import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const PHOTO_BUCKET = 'person-photos'
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) throw error
  return user?.id ?? null
}

function toErrorMessage(error) {
  if (!error) return 'Unknown error'
  if (typeof error === 'string') return error
  return error.message ?? 'Unknown error'
}

function arrayToPersonMap(persons) {
  return persons.reduce((map, person) => {
    map[person.id] = person
    return map
  }, {})
}

export async function fetchPersons(treeId) {
  try {
    const { data, error } = await supabase
      .from('persons')
      .select('*')
      .eq('tree_id', treeId)
      .eq('is_deleted', false)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })

    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (error) {
    return { data: null, error: toErrorMessage(error) }
  }
}

export async function fetchPerson(personId) {
  try {
    const { data, error } = await supabase
      .from('persons')
      .select('*')
      .eq('id', personId)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: toErrorMessage(error) }
  }
}

export async function addPerson(personData) {
  try {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('persons')
      .insert({ ...personData, created_by: userId, last_updated_by: userId })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: toErrorMessage(error) }
  }
}

export async function updatePerson(personId, updates) {
  try {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('persons')
      .update({ ...updates, last_updated_by: userId })
      .eq('id', personId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: toErrorMessage(error) }
  }
}

export async function softDeletePerson(personId) {
  try {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('persons')
      .update({ is_deleted: true, last_updated_by: userId })
      .eq('id', personId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: toErrorMessage(error) }
  }
}

export async function restorePerson(personId) {
  try {
    const { data: person, error: fetchError } = await supabase
      .from('persons')
      .select('tree_id')
      .eq('id', personId)
      .single()

    if (fetchError) throw fetchError

    const { data: role, error: roleError } = await supabase.rpc('get_user_role', {
      tree_uuid: person.tree_id,
    })

    if (roleError) throw roleError

    if (role !== 'owner') {
      return { data: null, error: 'Only the tree owner can restore deleted persons' }
    }

    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('persons')
      .update({ is_deleted: false, last_updated_by: userId })
      .eq('id', personId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: toErrorMessage(error) }
  }
}

export async function uploadPersonPhoto(file, personId) {
  try {
    const { data: person, error: personError } = await fetchPerson(personId)

    if (personError) return { data: null, error: personError }
    if (!person) return { data: null, error: 'Person not found' }

    const filename = file.name.replace(/[^\w.\-]/g, '_')
    const path = `${person.tree_id}/${personId}/${filename}`

    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) throw uploadError
    return { data: path, error: null }
  } catch (error) {
    return { data: null, error: toErrorMessage(error) }
  }
}

export async function getPersonPhotoUrl(storagePath) {
  try {
    if (!storagePath) {
      return { data: null, error: 'Storage path is required' }
    }

    const { data, error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS)

    if (error) throw error
    return { data: data?.signedUrl ?? null, error: null }
  } catch (error) {
    return { data: null, error: toErrorMessage(error) }
  }
}

export const usePersonsStore = create((set, get) => ({
  persons: {},
  loading: false,
  error: null,

  fetchPersons: async (treeId) => {
    set({ loading: true, error: null })

    const { data, error } = await fetchPersons(treeId)

    if (error) {
      set({ loading: false, error })
      return { data: null, error }
    }

    const persons = arrayToPersonMap(data)
    set({ persons, loading: false, error: null })
    return { data: persons, error: null }
  },

  setPerson: (person) => {
    if (!person?.id) return
    set((state) => ({
      persons: { ...state.persons, [person.id]: person },
    }))
  },

  removePerson: (personId) => {
    set((state) => {
      const { [personId]: removed, ...rest } = state.persons
      return { persons: rest }
    })
  },

  getPersonById: (personId) => get().persons[personId] ?? null,

  clearPersons: () => set({ persons: {}, loading: false, error: null }),
}))

export function usePersons() {
  const persons = usePersonsStore((state) => state.persons)
  const loading = usePersonsStore((state) => state.loading)
  const error = usePersonsStore((state) => state.error)
  const storeFetchPersons = usePersonsStore((state) => state.fetchPersons)
  const setPerson = usePersonsStore((state) => state.setPerson)
  const removePerson = usePersonsStore((state) => state.removePerson)
  const getPersonById = usePersonsStore((state) => state.getPersonById)
  const clearPersons = usePersonsStore((state) => state.clearPersons)

  return {
    persons,
    loading,
    error,
    fetchPersons: storeFetchPersons,
    fetchPerson,
    addPerson,
    updatePerson,
    softDeletePerson,
    restorePerson,
    uploadPersonPhoto,
    getPersonPhotoUrl,
    setPerson,
    removePerson,
    getPersonById,
    clearPersons,
  }
}
