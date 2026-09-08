export type FormValues = Record<string, unknown>

export type FormField = {
  key: string
  label: string
  kind?:
    | 'text'
    | 'multiline'
    | 'number'
    | 'nullableNumber'
    | 'list'
    | 'boolean'
    | 'choice'
    | 'multiple'
    | 'times'
  choices?: readonly { value: string | null; label: string }[]
  hint?: string
}

export interface FormSpec {
  title: string
  initial: FormValues
  fields: FormField[]
  save(values: FormValues): void | Promise<void>
}

export function messageFor(reason: unknown): string {
  if (reason && typeof reason === 'object' && 'issues' in reason && Array.isArray(reason.issues))
    return reason.issues.map((issue: { message: string }) => issue.message).join('\n')
  return reason instanceof Error ? reason.message : 'Не удалось сохранить. Повторите попытку.'
}

export const textField = (
  key: string,
  label: string,
  kind: FormField['kind'] = 'text',
  hint?: string
): FormField => ({ key, label, kind, hint })

export const choiceField = (
  key: string,
  label: string,
  choices: readonly { value: string | null; label: string }[]
): FormField => ({ key, label, kind: 'choice', choices })

export const numeric = (value: unknown): number =>
  typeof value === 'number'
    ? value
    : String(value ?? '').trim() === ''
      ? NaN
      : Number(String(value).replace(',', '.'))

export const nullableNumeric = (value: unknown): number | null =>
  value === null || value === undefined || String(value).trim() === '' ? null : numeric(value)
