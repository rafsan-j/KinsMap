export const OCCUPATION_CONFIG = {
  student: [
    {
      key: 'education_level',
      label: 'Education Level',
      type: 'select',
      options: [
        { value: 'school', label: 'School' },
        { value: 'college', label: 'College' },
        { value: 'university', label: 'University' },
        { value: 'madrasa', label: 'Madrasa' },
        { value: 'vocational', label: 'Vocational' },
      ],
      placeholder: 'Select level',
      required: true,
    },
    {
      key: 'institution_name',
      label: 'Institution Name',
      type: 'text',
      placeholder: 'e.g. Springfield High School',
      required: true,
    },
    {
      key: 'class_or_year',
      label: 'Class or Year',
      type: 'text',
      placeholder: 'e.g. Class 10, 2nd Year',
      required: false,
    },
    {
      key: 'section',
      label: 'Section',
      type: 'text',
      placeholder: 'e.g. A, Science',
      required: false,
    },
  ],

  professional: [
    {
      key: 'job_title',
      label: 'Job Title',
      type: 'text',
      placeholder: 'e.g. Software Engineer',
      required: true,
    },
    {
      key: 'employer',
      label: 'Employer',
      type: 'text',
      placeholder: 'Company or organization name',
      required: true,
    },
    {
      key: 'industry',
      label: 'Industry',
      type: 'text',
      placeholder: 'e.g. Technology, Healthcare',
      required: false,
    },
    {
      key: 'employment_type',
      label: 'Employment Type',
      type: 'select',
      options: [
        { value: 'full-time', label: 'Full-time' },
        { value: 'part-time', label: 'Part-time' },
        { value: 'contract', label: 'Contract' },
        { value: 'remote', label: 'Remote' },
      ],
      placeholder: 'Select type',
      required: false,
    },
  ],

  business: [
    {
      key: 'business_name',
      label: 'Business Name',
      type: 'text',
      placeholder: 'Name of the business',
      required: true,
    },
    {
      key: 'business_type',
      label: 'Business Type',
      type: 'text',
      placeholder: 'e.g. Retail, Consulting, Restaurant',
      required: false,
    },
    {
      key: 'business_location',
      label: 'Business Location',
      type: 'text',
      placeholder: 'City or address',
      required: false,
    },
    {
      key: 'established_year',
      label: 'Established Year',
      type: 'number',
      placeholder: 'e.g. 2015',
      required: false,
    },
  ],

  homemaker: [],

  retired: [
    {
      key: 'former_occupation',
      label: 'Former Occupation',
      type: 'text',
      placeholder: 'What they did before retiring',
      required: false,
    },
    {
      key: 'retired_year',
      label: 'Retired Year',
      type: 'number',
      placeholder: 'e.g. 2020',
      required: false,
    },
  ],

  unemployed: [],

  child: [],
}
