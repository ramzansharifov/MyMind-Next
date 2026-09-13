export interface StudyCodeLanguageOption {
  value: string
  label: string
  prismLanguage: string
}

export const STUDY_CODE_LANGUAGE_OPTIONS: StudyCodeLanguageOption[] = [
  { value: 'text', label: 'Текст', prismLanguage: 'plain' },
  { value: 'javascript', label: 'JavaScript', prismLanguage: 'javascript' },
  { value: 'typescript', label: 'TypeScript', prismLanguage: 'typescript' },
  { value: 'python', label: 'Python', prismLanguage: 'python' },
  { value: 'html', label: 'HTML', prismLanguage: 'markup' },
  { value: 'css', label: 'CSS', prismLanguage: 'css' },
  { value: 'sql', label: 'SQL', prismLanguage: 'sql' },
  { value: 'json', label: 'JSON', prismLanguage: 'json' },
  { value: 'bash', label: 'Bash', prismLanguage: 'bash' },
  { value: 'cpp', label: 'C++', prismLanguage: 'cpp' },
  { value: 'java', label: 'Java', prismLanguage: 'java' }
]

const aliases: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  xml: 'html',
  markup: 'html',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  c: 'cpp',
  'c++': 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  plaintext: 'text',
  plain: 'text',
  txt: 'text'
}

export function normalizeStudyCodeLanguage(value: string | undefined): string {
  const normalized = value?.trim().toLowerCase() || 'text'
  const resolved = aliases[normalized] ?? normalized
  return STUDY_CODE_LANGUAGE_OPTIONS.some((option) => option.value === resolved) ? resolved : 'text'
}

export function getStudyCodeLanguage(value: string | undefined): StudyCodeLanguageOption {
  const normalized = normalizeStudyCodeLanguage(value)
  return (
    STUDY_CODE_LANGUAGE_OPTIONS.find((option) => option.value === normalized) ??
    STUDY_CODE_LANGUAGE_OPTIONS[0]
  )
}
