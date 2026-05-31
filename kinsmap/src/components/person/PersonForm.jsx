import { useEffect, useMemo, useState } from 'react'
import { Pencil } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import PhotoUpload from './PhotoUpload'
import { supabase } from '../../lib/supabase'
import { OCCUPATION_CONFIG } from '../../lib/occupationConfig'
import { EDUCATION_LEVELS, EDUCATION_FIELDS } from '../../lib/educationConfig'

const STEPS = [
  'Basic Info',
  'Dates',
  'Contact & Location',
  'Current Occupation',
  'Education History',
  'Photo & Notes',
  'Review',
]

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'unspecified', label: 'Unspecified' },
]

const OCCUPATION_LABELS = {
  student: 'Student',
  professional: 'Professional',
  business: 'Business',
  homemaker: 'Homemaker',
  retired: 'Retired',
  unemployed: 'Unemployed',
  child: 'Child (under 12)',
}

const OCCUPATION_OPTIONS = Object.keys(OCCUPATION_CONFIG).map((key) => ({
  value: key,
  label: OCCUPATION_LABELS[key] ?? key,
}))

function shouldShowField(field, values) {
  if (!field.showWhen) return true
  const actual = values[field.showWhen.field]
  if (typeof field.showWhen.value === 'boolean') {
    return actual === field.showWhen.value
  }
  return actual === field.showWhen.value
}

function parseOccupation(initialData) {
  const occ = initialData?.current_occupation ?? {}
  const { category = '', ...fields } = occ
  return { category: category || '', fields }
}

function buildInitialForm(initialData) {
  const { category, fields } = parseOccupation(initialData)
  return {
    first_name: initialData?.first_name ?? '',
    last_name: initialData?.last_name ?? '',
    birth_name: initialData?.birth_name ?? '',
    nickname: initialData?.nickname ?? '',
    gender: initialData?.gender ?? 'unspecified',
    is_alive: initialData?.is_alive ?? true,
    birth_date: initialData?.birth_date ?? '',
    death_date: initialData?.death_date ?? '',
    birth_date_approx: initialData?.birth_date_approx ?? false,
    death_date_approx: initialData?.death_date_approx ?? false,
    phone: initialData?.phone ?? '',
    address_line: initialData?.address_line ?? '',
    city: initialData?.city ?? '',
    country: initialData?.country ?? '',
    occupationCategory: category,
    occupationFields: fields,
    education_history: Array.isArray(initialData?.education_history)
      ? initialData.education_history
      : [],
    notes: initialData?.notes ?? '',
  }
}

function DynamicFields({ fields, values, onChange }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        if (!shouldShowField(field, values)) return null

        if (field.type === 'select') {
          return (
            <Select
              key={field.key}
              label={field.label}
              value={values[field.key] ?? ''}
              onChange={(value) => onChange(field.key, value)}
              options={field.options}
              placeholder={field.placeholder}
            />
          )
        }

        if (field.type === 'boolean') {
          return (
            <label
              key={field.key}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 sm:col-span-2"
            >
              <input
                type="checkbox"
                checked={Boolean(values[field.key])}
                onChange={(event) => onChange(field.key, event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-gray-700">{field.label}</span>
            </label>
          )
        }

        return (
          <Input
            key={field.key}
            label={field.label}
            type={field.type === 'number' ? 'number' : 'text'}
            value={values[field.key] ?? ''}
            onChange={(event) =>
              onChange(
                field.key,
                field.type === 'number' ? event.target.value : event.target.value,
              )
            }
            placeholder={field.placeholder}
            required={field.required}
          />
        )
      })}
    </div>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-indigo-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  )
}

function ReviewSection({ title, step, onEdit, children }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>
      <div className="space-y-1 text-sm text-gray-600">{children}</div>
    </div>
  )
}

function formatEducationSummary(entry) {
  const level =
    EDUCATION_LEVELS.find((item) => item.value === entry.level)?.label ?? entry.level
  const institution = entry.institution_name || 'Unknown institution'
  const years =
    entry.is_ongoing
      ? `${entry.start_year || '?'} – present`
      : entry.start_year || entry.end_year
        ? `${entry.start_year || '?'} – ${entry.end_year || '?'}`
        : 'Years not specified'
  return `${level} · ${institution} · ${years}`
}

export default function PersonForm({
  mode = 'add',
  initialData = null,
  prefilledRelation = null,
  treeId,
  onSuccess,
  onClose,
  maxStep = STEPS.length,
  embedded = false,
  deferSave = false,
  heading,
  description,
  submitLabel,
  showCancel = true,
}) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(() => buildInitialForm(initialData))
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [showEducationForm, setShowEducationForm] = useState(false)
  const [editingEducationIndex, setEditingEducationIndex] = useState(null)
  const [draftEducation, setDraftEducation] = useState({ level: '', is_ongoing: false })

  const existingPhotoUrl = useMemo(() => {
    if (photoPreview || !initialData?.profile_picture_url) return null
    const { data } = supabase.storage
      .from('person-photos')
      .getPublicUrl(initialData.profile_picture_url)
    return data.publicUrl
  }, [initialData?.profile_picture_url, photoPreview])

  const occupationFieldDefs = useMemo(
    () => OCCUPATION_CONFIG[form.occupationCategory] ?? [],
    [form.occupationCategory],
  )

  const educationFieldDefs = useMemo(
    () => EDUCATION_FIELDS[draftEducation.level] ?? [],
    [draftEducation.level],
  )

  useEffect(() => {
    setForm(buildInitialForm(initialData))
  }, [initialData])

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateOccupationField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      occupationFields: { ...prev.occupationFields, [key]: value },
    }))
  }

  const updateDraftEducation = (key, value) => {
    setDraftEducation((prev) => ({ ...prev, [key]: value }))
  }

  const handleOccupationCategoryChange = (category) => {
    setForm((prev) => ({
      ...prev,
      occupationCategory: category,
      occupationFields: {},
    }))
  }

  const openAddEducation = () => {
    setDraftEducation({ level: '', is_ongoing: false })
    setEditingEducationIndex(null)
    setShowEducationForm(true)
  }

  const openEditEducation = (index) => {
    setDraftEducation({ ...form.education_history[index] })
    setEditingEducationIndex(index)
    setShowEducationForm(true)
  }

  const saveEducationEntry = () => {
    if (!draftEducation.level) {
      setError('Please select an education level')
      return
    }

    const entry = { ...draftEducation, level: draftEducation.level }
    setForm((prev) => {
      const history = [...prev.education_history]
      if (editingEducationIndex !== null) {
        history[editingEducationIndex] = entry
      } else {
        history.push(entry)
      }
      return { ...prev, education_history: history }
    })
    setShowEducationForm(false)
    setDraftEducation({ level: '', is_ongoing: false })
    setEditingEducationIndex(null)
    setError('')
  }

  const removeEducationEntry = (index) => {
    setForm((prev) => ({
      ...prev,
      education_history: prev.education_history.filter((_, i) => i !== index),
    }))
  }

  const validateStep = () => {
    if (step === 1 && !form.first_name.trim()) {
      setError('First name is required')
      return false
    }
    setError('')
    return true
  }

  const totalSteps = Math.min(maxStep, STEPS.length)

  const goNext = () => {
    if (!validateStep()) return
    if (step >= totalSteps) {
      handleSubmit()
      return
    }
    setStep((prev) => Math.min(prev + 1, totalSteps))
  }

  const goBack = () => {
    setError('')
    setStep((prev) => Math.max(prev - 1, 1))
  }

  const applyPrefilledParents = async (row, personId) => {
    if (mode !== 'add' || !prefilledRelation) return row

    const { type, relatedPersonId } = prefilledRelation
    const { data: related, error: fetchError } = await supabase
      .from('persons')
      .select('id, gender, father_id, mother_id, father_rel_type, mother_rel_type')
      .eq('id', relatedPersonId)
      .single()

    if (fetchError) throw fetchError

    if (type === 'child') {
      if (related.gender === 'female') {
        row.mother_id = related.id
        row.mother_rel_type = 'biological'
      } else {
        row.father_id = related.id
        row.father_rel_type = 'biological'
      }
    } else if (type === 'sibling') {
      row.father_id = related.father_id
      row.mother_id = related.mother_id
      row.father_rel_type = related.father_rel_type
      row.mother_rel_type = related.mother_rel_type
    } else if (type === 'father') {
      await supabase
        .from('persons')
        .update({ father_id: personId, father_rel_type: 'biological' })
        .eq('id', relatedPersonId)
    } else if (type === 'mother') {
      await supabase
        .from('persons')
        .update({ mother_id: personId, mother_rel_type: 'biological' })
        .eq('id', relatedPersonId)
    }

    return row
  }

  const buildPersonRow = (personId, profilePictureUrl) => {
    const occupation =
      form.occupationCategory && form.occupationCategory !== 'child'
        ? { category: form.occupationCategory, ...form.occupationFields }
        : form.occupationCategory === 'child'
          ? { category: 'child' }
          : null

    return {
      tree_id: treeId,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim() || null,
      birth_name: form.birth_name.trim() || null,
      nickname: form.nickname.trim() || null,
      gender: form.gender,
      is_alive: form.is_alive,
      birth_date: form.birth_date || null,
      death_date: form.is_alive ? null : form.death_date || null,
      birth_date_approx: form.birth_date_approx,
      death_date_approx: form.is_alive ? false : form.death_date_approx,
      phone: form.phone.trim() || null,
      address_line: form.address_line.trim() || null,
      city: form.city.trim() || null,
      country: form.country.trim() || null,
      current_occupation: occupation,
      education_history: form.education_history,
      notes: form.notes.trim() || null,
      profile_picture_url: profilePictureUrl,
    }
  }

  const handleSubmit = async () => {
    if (!form.first_name.trim()) {
      setError('First name is required')
      setStep(1)
      return
    }

    setSaving(true)
    setError('')

    try {
      const personId = mode === 'edit' ? initialData.id : crypto.randomUUID()
      let profilePictureUrl = initialData?.profile_picture_url ?? null

      if (photoFile && treeId && !deferSave) {
        const extension = photoFile.name.split('.').pop()?.toLowerCase() || 'jpg'
        const path = `${treeId}/${personId}/profile.${extension}`
        const { error: uploadError } = await supabase.storage
          .from('person-photos')
          .upload(path, photoFile, { upsert: true, contentType: photoFile.type })

        if (uploadError) throw uploadError
        profilePictureUrl = path
      }

      let row = buildPersonRow(personId, profilePictureUrl)

      if (deferSave) {
        onSuccess?.({ ...row, id: personId })
        return
      }

      if (mode === 'add') {
        row = await applyPrefilledParents({ ...row, id: personId }, personId)
        const { data, error: insertError } = await supabase
          .from('persons')
          .insert(row)
          .select()
          .single()

        if (insertError) throw insertError
        onSuccess?.(data)
      } else {
        const { data, error: updateError } = await supabase
          .from('persons')
          .update(row)
          .eq('id', initialData.id)
          .select()
          .single()

        if (updateError) throw updateError
        onSuccess?.(data)
      }
    } catch (err) {
      setError(err.message || 'Failed to save person')
    } finally {
      setSaving(false)
    }
  }

  const fullName = [form.first_name, form.last_name].filter(Boolean).join(' ') || 'Unnamed'

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <Input
              label="First Name"
              value={form.first_name}
              onChange={(event) => updateForm('first_name', event.target.value)}
              placeholder="Required"
              required
              error={error && !form.first_name.trim() ? error : undefined}
            />
            <Input
              label="Last Name"
              value={form.last_name}
              onChange={(event) => updateForm('last_name', event.target.value)}
            />
            <Input
              label="Birth/Maiden Name — if different"
              value={form.birth_name}
              onChange={(event) => updateForm('birth_name', event.target.value)}
            />
            <Input
              label="Nickname"
              value={form.nickname}
              onChange={(event) => updateForm('nickname', event.target.value)}
            />
            <Select
              label="Gender"
              value={form.gender}
              onChange={(value) => updateForm('gender', value)}
              options={GENDER_OPTIONS}
            />
            <Toggle
              label="Currently alive"
              checked={form.is_alive}
              onChange={(value) => updateForm('is_alive', value)}
            />
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <Input
              label="Birth Date"
              type="date"
              value={form.birth_date}
              onChange={(event) => updateForm('birth_date', event.target.value)}
            />
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={form.birth_date_approx}
                onChange={(event) => updateForm('birth_date_approx', event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">I only know the approximate date</span>
            </label>

            {!form.is_alive && (
              <>
                <Input
                  label="Death Date"
                  type="date"
                  value={form.death_date}
                  onChange={(event) => updateForm('death_date', event.target.value)}
                />
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.death_date_approx}
                    onChange={(event) => updateForm('death_date_approx', event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">
                    I only know the approximate death date
                  </span>
                </label>
              </>
            )}
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <Input
              label="Phone"
              type="tel"
              value={form.phone}
              onChange={(event) => updateForm('phone', event.target.value)}
            />
            <Input
              label="Address Line"
              value={form.address_line}
              onChange={(event) => updateForm('address_line', event.target.value)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="City"
                value={form.city}
                onChange={(event) => updateForm('city', event.target.value)}
              />
              <Input
                label="Country"
                value={form.country}
                onChange={(event) => updateForm('country', event.target.value)}
              />
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <Select
              label="Occupation Category"
              value={form.occupationCategory}
              onChange={handleOccupationCategoryChange}
              options={OCCUPATION_OPTIONS}
              placeholder="Select category (optional)"
            />

            {form.occupationCategory === 'child' && (
              <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No occupation details needed for young children.
              </p>
            )}

            {form.occupationCategory &&
              form.occupationCategory !== 'child' &&
              occupationFieldDefs.length > 0 && (
                <DynamicFields
                  fields={occupationFieldDefs}
                  values={form.occupationFields}
                  onChange={updateOccupationField}
                />
              )}
          </div>
        )

      case 5:
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Education History (Optional — add as many as you like)
            </p>

            {form.education_history.length > 0 && (
              <ul className="space-y-2">
                {form.education_history.map((entry, index) => (
                  <li
                    key={`${entry.level}-${entry.institution_name}-${index}`}
                    className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="text-sm text-gray-800">
                      {formatEducationSummary(entry)}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => openEditEducation(index)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => removeEducationEntry(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {!showEducationForm && (
              <Button variant="secondary" type="button" onClick={openAddEducation}>
                Add Education Entry
              </Button>
            )}

            {showEducationForm && (
              <div className="space-y-4 rounded-lg border border-indigo-200 bg-indigo-50/40 p-4">
                <Select
                  label="Education Level"
                  value={draftEducation.level}
                  onChange={(value) =>
                    setDraftEducation({ level: value, is_ongoing: false })
                  }
                  options={EDUCATION_LEVELS}
                  placeholder="Select level"
                />

                {draftEducation.level && (
                  <DynamicFields
                    fields={educationFieldDefs}
                    values={draftEducation}
                    onChange={updateDraftEducation}
                  />
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" onClick={saveEducationEntry}>
                    Save Entry
                  </Button>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => {
                      setShowEducationForm(false)
                      setDraftEducation({ level: '', is_ongoing: false })
                      setEditingEducationIndex(null)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )

      case 6:
        return (
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-sm font-medium text-gray-700">Profile Photo</p>
              <PhotoUpload
                previewUrl={photoPreview}
                existingUrl={existingPhotoUrl}
                onFileChange={(file, url) => {
                  setPhotoFile(file)
                  setPhotoPreview(url)
                }}
              />
            </div>
            <div>
              <label
                htmlFor="person-notes"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Notes, stories, memories about this person
              </label>
              <textarea
                id="person-notes"
                rows={5}
                value={form.notes}
                onChange={(event) => updateForm('notes', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Share memories, anecdotes, or important details…"
              />
            </div>
          </div>
        )

      case 7:
        return (
          <div className="space-y-4">
            <ReviewSection title="Basic Info" step={1} onEdit={setStep}>
              <p>
                <span className="font-medium text-gray-800">{fullName}</span>
                {form.nickname && ` (“${form.nickname}”)`}
              </p>
              <p>Gender: {GENDER_OPTIONS.find((g) => g.value === form.gender)?.label}</p>
              <p>{form.is_alive ? 'Alive' : 'Deceased'}</p>
            </ReviewSection>

            <ReviewSection title="Dates" step={2} onEdit={setStep}>
              <p>
                Birth: {form.birth_date || 'Not set'}
                {form.birth_date_approx && ' (approx.)'}
              </p>
              {!form.is_alive && (
                <p>
                  Death: {form.death_date || 'Not set'}
                  {form.death_date_approx && ' (approx.)'}
                </p>
              )}
            </ReviewSection>

            <ReviewSection title="Contact & Location" step={3} onEdit={setStep}>
              <p>{form.phone || 'No phone'}</p>
              <p>
                {[form.address_line, form.city, form.country].filter(Boolean).join(', ') ||
                  'No address'}
              </p>
            </ReviewSection>

            <ReviewSection title="Occupation" step={4} onEdit={setStep}>
              {form.occupationCategory ? (
                <>
                  <p>
                    {OCCUPATION_LABELS[form.occupationCategory] ?? form.occupationCategory}
                  </p>
                  {Object.entries(form.occupationFields).map(([key, value]) =>
                    value ? (
                      <p key={key}>
                        {key.replace(/_/g, ' ')}: {String(value)}
                      </p>
                    ) : null,
                  )}
                </>
              ) : (
                <p>Skipped</p>
              )}
            </ReviewSection>

            <ReviewSection title="Education" step={5} onEdit={setStep}>
              {form.education_history.length === 0 ? (
                <p>None added</p>
              ) : (
                form.education_history.map((entry, index) => (
                  <p key={`review-edu-${index}`}>{formatEducationSummary(entry)}</p>
                ))
              )}
            </ReviewSection>

            <ReviewSection title="Photo & Notes" step={6} onEdit={setStep}>
              <p>{photoFile || initialData?.profile_picture_url ? 'Photo added' : 'No photo'}</p>
              <p>{form.notes || 'No notes'}</p>
            </ReviewSection>
          </div>
        )

      default:
        return null
    }
  }

  const isSkippableStep = totalSteps === STEPS.length && (step === 4 || step === 5)
  const isLastStep = step >= totalSteps

  const formBody = (
    <div className="flex flex-col">
      {(heading || description) && (
        <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
          {heading && <h2 className="text-lg font-semibold text-gray-900">{heading}</h2>}
          {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
        </div>
      )}

      <div className={`border-b border-gray-200 px-4 py-4 sm:px-6 ${heading || description ? '' : ''}`}>
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-500">
          <span>
            Step {step} of {totalSteps}
          </span>
          <span>{STEPS[step - 1]}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 px-4 py-5 sm:px-6">{renderStep()}</div>

      {error && step !== 1 && (
        <p className="px-4 pb-2 text-sm text-red-600 sm:px-6">{error}</p>
      )}

      <div className="flex flex-col-reverse gap-2 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex gap-2">
          {step > 1 && (
            <Button variant="secondary" type="button" onClick={goBack} disabled={saving}>
              Back
            </Button>
          )}
          {isSkippableStep && !isLastStep && (
            <Button variant="ghost" type="button" onClick={goNext} disabled={saving}>
              Skip
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {showCancel && onClose && (
            <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
          )}
          {isLastStep ? (
            <Button type="button" onClick={handleSubmit} disabled={saving}>
              {saving
                ? 'Saving…'
                : submitLabel ?? (mode === 'edit' ? 'Save Changes' : 'Add Person')}
            </Button>
          ) : (
            <Button type="button" onClick={goNext}>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  )

  if (embedded) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {formBody}
      </div>
    )
  }

  return (
    <Modal
      title={mode === 'edit' ? 'Edit Person' : 'Add Person'}
      onClose={onClose}
      className="max-w-2xl"
    >
      {formBody}
    </Modal>
  )
}
