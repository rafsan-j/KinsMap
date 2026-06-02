const COMMON_EDUCATION_FIELDS = [
  {
    key: 'start_year',
    label: 'Start Year',
    type: 'number',
    placeholder: 'e.g. 2018',
    required: false,
  },
  {
    key: 'end_year',
    label: 'End Year',
    type: 'number',
    placeholder: 'e.g. 2022',
    required: false,
    showWhen: { field: 'is_ongoing', value: false },
  },
  {
    key: 'is_ongoing',
    label: 'Currently studying here',
    type: 'boolean',
    required: false,
  },
  {
    key: 'degree_or_certificate',
    label: 'Degree or Certificate',
    type: 'text',
    placeholder: 'e.g. SSC, BSc, Diploma',
    required: false,
  },
]

export const EDUCATION_LEVELS = [
  { value: 'school', label: 'School' },
  { value: 'college', label: 'College' },
  { value: 'university', label: 'University' },
  { value: 'madrasa', label: 'Madrasa' },
  { value: 'vocational', label: 'Vocational' },
  { value: 'other', label: 'Other' },
]

export const EDUCATION_FIELDS = {
  school: [
    {
      key: 'institution_name',
      label: 'Institution Name',
      type: 'text',
      placeholder: 'School name',
      required: true,
    },
    {
      key: 'class_grade',
      label: 'Class / Grade',
      type: 'text',
      placeholder: 'e.g. Class 8, Grade 5',
      required: false,
    },
    {
      key: 'section',
      label: 'Section',
      type: 'text',
      placeholder: 'e.g. A, B',
      required: false,
    },
    {
      key: 'board',
      label: 'Board',
      type: 'text',
      placeholder: 'e.g. Dhaka Board, CBSE',
      required: false,
    },
    ...COMMON_EDUCATION_FIELDS,
  ],

  college: [
    {
      key: 'institution_name',
      label: 'Institution Name',
      type: 'text',
      placeholder: 'College name',
      required: true,
    },
    {
      key: 'group',
      label: 'Group',
      type: 'select',
      options: [
        { value: 'science', label: 'Science' },
        { value: 'arts', label: 'Arts' },
        { value: 'commerce', label: 'Commerce' },
        { value: 'other', label: 'Other' },
      ],
      placeholder: 'Select group',
      required: false,
    },
    {
      key: 'board',
      label: 'Board',
      type: 'text',
      placeholder: 'e.g. Dhaka Board, HSC',
      required: false,
    },
    ...COMMON_EDUCATION_FIELDS,
  ],

  university: [
    {
      key: 'institution_name',
      label: 'Institution Name',
      type: 'text',
      placeholder: 'University name',
      required: true,
    },
    {
      key: 'department',
      label: 'Department',
      type: 'text',
      placeholder: 'e.g. Computer Science',
      required: false,
    },
    {
      key: 'degree_program',
      label: 'Degree Program',
      type: 'text',
      placeholder: 'e.g. BSc in CSE',
      required: false,
    },
    {
      key: 'session',
      label: 'Session',
      type: 'text',
      placeholder: 'e.g. 2020–2021',
      required: false,
    },
    {
      key: 'current_year_of_study',
      label: 'Current Year of Study',
      type: 'number',
      placeholder: 'e.g. 3',
      required: false,
      showWhen: { field: 'is_ongoing', value: true },
    },
    ...COMMON_EDUCATION_FIELDS,
  ],

  madrasa: [
    {
      key: 'institution_name',
      label: 'Institution Name',
      type: 'text',
      placeholder: 'Madrasa name',
      required: true,
    },
    {
      key: 'class_level',
      label: 'Class Level',
      type: 'text',
      placeholder: 'e.g. Dawra, Hifz',
      required: false,
    },
    {
      key: 'board',
      label: 'Board',
      type: 'text',
      placeholder: 'e.g. Bangladesh Madrasa Board',
      required: false,
    },
    ...COMMON_EDUCATION_FIELDS,
  ],

  vocational: [
    {
      key: 'institution_name',
      label: 'Institution Name',
      type: 'text',
      placeholder: 'Training center or institute',
      required: true,
    },
    {
      key: 'course_name',
      label: 'Course Name',
      type: 'text',
      placeholder: 'e.g. Electrical Technician',
      required: true,
    },
    {
      key: 'duration',
      label: 'Duration',
      type: 'text',
      placeholder: 'e.g. 6 months, 2 years',
      required: false,
    },
    ...COMMON_EDUCATION_FIELDS,
  ],

  other: [
    {
      key: 'institution_name',
      label: 'Institution Name',
      type: 'text',
      placeholder: 'Institution or program name',
      required: true,
    },
    {
      key: 'description',
      label: 'Description',
      type: 'text',
      placeholder: 'Brief description of the education',
      required: false,
    },
    ...COMMON_EDUCATION_FIELDS,
  ],
}
