export interface StudyCodeLanguageOption {
  value: string
  label: string
  prismLanguage: string
}

export const STUDY_CODE_LANGUAGE_OPTIONS: StudyCodeLanguageOption[] = [
  {
    value: 'text',
    label: 'Текст',
    prismLanguage: 'plain'
  },
  {
    value: 'javascript',
    label: 'JavaScript',
    prismLanguage: 'javascript'
  },
  {
    value: 'typescript',
    label: 'TypeScript',
    prismLanguage: 'typescript'
  },
  {
    value: 'python',
    label: 'Python',
    prismLanguage: 'python'
  },
  {
    value: 'html',
    label: 'HTML',
    prismLanguage: 'markup'
  },
  {
    value: 'css',
    label: 'CSS',
    prismLanguage: 'css'
  },
  {
    value: 'sql',
    label: 'SQL',
    prismLanguage: 'sql'
  },
  {
    value: 'json',
    label: 'JSON',
    prismLanguage: 'json'
  },
  {
    value: 'bash',
    label: 'Bash',
    prismLanguage: 'bash'
  },
  {
    value: 'cpp',
    label: 'C++',
    prismLanguage: 'cpp'
  },
  {
    value: 'java',
    label: 'Java',
    prismLanguage: 'java'
  }
]

const fallbackCodeLanguage =
  STUDY_CODE_LANGUAGE_OPTIONS[0]

export function getStudyCodeLanguage(
  value: string | undefined
): StudyCodeLanguageOption {
  return (
    STUDY_CODE_LANGUAGE_OPTIONS.find(
      (option) => option.value === value
    ) ?? fallbackCodeLanguage
  )
}