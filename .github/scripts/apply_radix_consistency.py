from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one exact match, got {count}: {old[:120]!r}')
    write(path, text.replace(old, new, 1))


def regex_once(path: str, pattern: str, replacement: str) -> None:
    text = read(path)
    next_text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f'{path}: expected one regex match, got {count}: {pattern[:120]!r}')
    write(path, next_text)


def add_after(path: str, anchor: str, addition: str) -> None:
    replace_once(path, anchor, anchor + addition)


# --- Finance primitives: native title on FinanceButton becomes the shared Radix tooltip. ---
path = 'src/renderer/src/modules/finance/components/FinancePrimitives.tsx'
add_after(path, "import { cn } from '../../../shared/lib/cn'\n", "import { Tooltip } from '../../../shared/ui/tooltip'\n")
regex_once(
    path,
    r"export function FinanceButton\(\{.*?\n\}\n\nexport function FinanceLoadingState",
    '''export function FinanceButton({
  tone = 'neutral',
  size = 'md',
  className,
  children,
  title,
  ...props
}: FinanceButtonProps): React.JSX.Element {
  const button = (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-violet-500/45 disabled:cursor-not-allowed disabled:opacity-45',
        size === 'sm' ? 'h-9 px-3' : 'h-11 px-4',
        tone === 'primary' && 'border-violet-500/30 bg-violet-500 text-white hover:bg-violet-400',
        tone === 'neutral' &&
          'border-[var(--app-border)] bg-[var(--app-surface-raised)] text-[var(--app-text)] hover:border-[var(--app-border-strong)] hover:bg-[var(--app-control-hover)]',
        tone === 'positive' &&
          'border-emerald-500/25 bg-emerald-500/12 text-emerald-200 hover:bg-emerald-500/20',
        tone === 'danger' && 'border-red-500/25 bg-red-500/10 text-red-200 hover:bg-red-500/18',
        tone === 'warning' &&
          'border-amber-500/25 bg-amber-500/10 text-amber-200 hover:bg-amber-500/18',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )

  if (!title) return button

  if (props.disabled) {
    return (
      <Tooltip content={title} side="top">
        <span className="inline-flex" tabIndex={0}>
          {button}
        </span>
      </Tooltip>
    )
  }

  return (
    <Tooltip content={title} side="top">
      {button}
    </Tooltip>
  )
}

export function FinanceLoadingState'''
)

# --- Finance reports: all platform selects/dates + native tooltip. ---
path = 'src/renderer/src/modules/finance/components/FinanceReports.tsx'
add_after(
    path,
    "import { useCallback, useEffect, useMemo, useRef, useState } from 'react'\n",
    "\nimport { AppDateField } from '../../../shared/ui/AppDateField'\nimport { AppSelect } from '../../../shared/ui/AppSelect'\nimport { Tooltip } from '../../../shared/ui/tooltip'\n"
)
regex_once(
    path,
    r'''<input\s+aria-label="Начальная дата"\s+type="date"\s+value=\{from\}.*?className=\{financeInputClassName\}\s*/>''',
    '''<AppDateField
                ariaLabel="Начальная дата"
                value={from}
                inputClassName={financeInputClassName}
                onChange={(value) => {
                  if (value) setFrom(value)
                }}
              />'''
)
regex_once(
    path,
    r'''<input\s+aria-label="Конечная дата"\s+type="date"\s+value=\{to\}.*?className=\{financeInputClassName\}\s*/>''',
    '''<AppDateField
                ariaLabel="Конечная дата"
                value={to}
                inputClassName={financeInputClassName}
                onChange={(value) => {
                  if (value) setTo(value)
                }}
              />'''
)
regex_once(
    path,
    r'''<select\s+aria-label="Тип операции".*?</select>''',
    '''<AppSelect
              ariaLabel="Тип операции"
              value={type}
              triggerClassName={financeInputClassName}
              options={[
                { value: 'all', label: 'Все операции' },
                { value: 'income', label: 'Только доходы' },
                { value: 'expense', label: 'Только расходы' },
                { value: 'transfer', label: 'Только переводы' }
              ]}
              onValueChange={(value) => setType(value as ReportType)}
            />'''
)
regex_once(
    path,
    r'''<select\s+aria-label="Счёт".*?</select>''',
    '''<AppSelect
              ariaLabel="Счёт"
              value={accountId}
              triggerClassName={financeInputClassName}
              options={[
                { value: 'all', label: 'Все счета' },
                ...accounts.map((account) => ({
                  value: account.id,
                  label: `${account.name} · ${account.currencyCode}`
                }))
              ]}
              onValueChange={setAccountId}
            />'''
)
regex_once(
    path,
    r'''<select\s+aria-label="Тег".*?</select>''',
    '''<AppSelect
              ariaLabel="Тег"
              value={tagId}
              disabled={type === 'transfer'}
              triggerClassName={financeInputClassName}
              options={[
                { value: 'all', label: 'Все теги' },
                ...availableTags.map((tag) => ({ value: tag.id, label: tag.name }))
              ]}
              onValueChange={setTagId}
            />'''
)
regex_once(
    path,
    r'''<select\s+aria-label="Источник операции".*?</select>''',
    '''<AppSelect
              ariaLabel="Источник операции"
              value={templateMode}
              triggerClassName={financeInputClassName}
              options={[
                { value: 'all', label: 'Все операции' },
                { value: 'template', label: 'Из шаблонов' },
                { value: 'manual', label: 'Созданные вручную' }
              ]}
              onValueChange={(value) => setTemplateMode(value as TemplateMode)}
            />'''
)
replace_once(
    path,
    '''      <div className="mt-2 truncate text-sm font-semibold text-[var(--app-text)]" title={value}>
        {value}
      </div>''',
    '''      <Tooltip content={value} side="top">
        <div className="mt-2 truncate text-sm font-semibold text-[var(--app-text)]" tabIndex={0}>
          {value}
        </div>
      </Tooltip>'''
)

# --- Finance transactions: Radix selects and checkbox. ---
path = 'src/renderer/src/modules/finance/components/FinanceTransactions.tsx'
add_after(
    path,
    "import { useCallback, useEffect, useMemo, useState } from 'react'\n",
    "\nimport { AppCheckbox } from '../../../shared/ui/AppCheckbox'\nimport { AppSelect } from '../../../shared/ui/AppSelect'\n"
)
regex_once(
    path,
    r'''<select\s+aria-label="Тип операции".*?</select>''',
    '''<AppSelect
            ariaLabel="Тип операции"
            value={type}
            triggerClassName={financeInputClassName}
            options={[
              { value: 'all', label: 'Все типы' },
              { value: 'income', label: 'Доходы' },
              { value: 'expense', label: 'Расходы' },
              { value: 'transfer', label: 'Переводы' },
              { value: 'adjustment', label: 'Корректировки' }
            ]}
            onValueChange={(value) => {
              setType(value)
              setOffset(0)
            }}
          />'''
)
regex_once(
    path,
    r'''<select\s+aria-label="Счёт".*?</select>''',
    '''<AppSelect
            ariaLabel="Счёт"
            value={accountId}
            triggerClassName={financeInputClassName}
            options={[
              { value: 'all', label: 'Все счета' },
              ...accounts.map((account) => ({ value: account.id, label: account.name }))
            ]}
            onValueChange={(value) => {
              setAccountId(value)
              setOffset(0)
            }}
          />'''
)
regex_once(
    path,
    r'''<select\s+aria-label="Тег".*?</select>''',
    '''<AppSelect
            ariaLabel="Тег"
            value={tagId}
            triggerClassName={financeInputClassName}
            options={[
              { value: 'all', label: 'Все теги' },
              ...tags.map((tag) => ({ value: tag.id, label: tag.name }))
            ]}
            onValueChange={(value) => {
              setTagId(value)
              setOffset(0)
            }}
          />'''
)
regex_once(
    path,
    r'''<label className="flex items-center gap-2 text-sm text-\[var\(--app-muted\)\]">\s*<input\s+type="checkbox"\s+checked=\{includeSystem\}.*?/>\s*Показывать системные операции\s*</label>''',
    '''<label
            htmlFor="finance-include-system"
            className="flex cursor-pointer items-center gap-2 text-sm text-[var(--app-muted)]"
          >
            <AppCheckbox
              id="finance-include-system"
              ariaLabel="Показывать системные операции"
              checked={includeSystem}
              onCheckedChange={(checked) => {
                setIncludeSystem(checked)
                setOffset(0)
              }}
            />
            Показывать системные операции
          </label>'''
)

# --- Finance limit dialog select. ---
path = 'src/renderer/src/modules/finance/components/dialogs/FinanceLimitDialog.tsx'
add_after(path, "import { AppDialog } from '../../../../shared/ui/AppDialog'\n", "import { AppSelect } from '../../../../shared/ui/AppSelect'\n")
replace_once(
    path,
    '''          <FinanceField label="Период" error={errors.periodType?.message}>
            <select {...register('periodType')} className={financeInputClassName}>
              <option value="day">День</option>
              <option value="week">Неделя</option>
              <option value="month">Месяц</option>
              <option value="year">Год</option>
            </select>
          </FinanceField>''',
    '''          <FinanceField label="Период" error={errors.periodType?.message}>
            <Controller
              control={control}
              name="periodType"
              render={({ field }) => (
                <AppSelect
                  ariaLabel="Период лимита"
                  value={field.value}
                  triggerClassName={financeInputClassName}
                  options={[
                    { value: 'day', label: 'День' },
                    { value: 'week', label: 'Неделя' },
                    { value: 'month', label: 'Месяц' },
                    { value: 'year', label: 'Год' }
                  ]}
                  onValueChange={field.onChange}
                />
              )}
            />
          </FinanceField>'''
)

# --- Finance dropdown and collapsible chart details. ---
path = 'src/renderer/src/modules/finance/components/FinanceTransactionList.tsx'
add_after(path, "import {\n", "")
text = read(path)
if "@radix-ui/react-dropdown-menu" not in text:
    text = "import * as DropdownMenu from '@radix-ui/react-dropdown-menu'\n" + text
    write(path, text)
regex_once(
    path,
    r'''<details className="relative">\s*<summary\s+aria-label="Действия с операцией".*?</summary>\s*<div className="absolute right-0 z-20 mt-1 w-36.*?</div>\s*</details>''',
    '''<DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label="Действия с операцией"
              className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] outline-none hover:bg-[var(--app-control-hover)] focus-visible:ring-2 focus-visible:ring-violet-500/35"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              collisionPadding={10}
              className="z-[100] min-w-36 rounded-xl border border-[var(--app-border)] bg-[var(--app-menu)] p-1 text-sm shadow-[var(--app-shadow-menu)] outline-none"
            >
              {onEdit && (
                <DropdownMenu.Item asChild>
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-[var(--app-text)] outline-none hover:bg-[var(--app-control-hover)] focus:bg-[var(--app-control-hover)]"
                    onClick={() => onEdit(transaction)}
                  >
                    Изменить
                  </button>
                </DropdownMenu.Item>
              )}
              {onDelete && (
                <DropdownMenu.Item asChild>
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-red-300 outline-none hover:bg-red-500/10 focus:bg-red-500/10"
                    onClick={() => onDelete(transaction)}
                  >
                    Удалить
                  </button>
                </DropdownMenu.Item>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>'''
)

path = 'src/renderer/src/modules/finance/components/charts/FinanceCharts.tsx'
text = read(path)
if "@radix-ui/react-collapsible" not in text:
    text = "import * as Collapsible from '@radix-ui/react-collapsible'\n" + text
if "shared/ui/tooltip" not in text:
    text = text.replace("import { cn } from '../../../../shared/lib/cn'\n", "import { cn } from '../../../../shared/lib/cn'\nimport { Tooltip } from '../../../../shared/ui/tooltip'\n")
write(path, text)
regex_once(
    path,
    r'''<details className="text-xs text-\[var\(--app-muted\)\]">\s*<summary className="cursor-pointer select-none">Показать точные значения</summary>\s*(<div className="mt-2 max-h-64.*?</div>)\s*</details>''',
    '''<Collapsible.Root className="text-xs text-[var(--app-muted)]">
        <Collapsible.Trigger asChild>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-left font-medium outline-none transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-violet-500/35"
          >
            Показать точные значения
          </button>
        </Collapsible.Trigger>
        <Collapsible.Content>
          \1
        </Collapsible.Content>
      </Collapsible.Root>'''
)
replace_once(
    path,
    '''              <div
                className="h-full rounded-full bg-[var(--app-accent-500)]"
                style={{ width: `${Math.max(2, (Math.abs(item.value) / maximum) * 100)}%` }}
                title={`${item.label}: ${formatMoneyMinor(item.value, currencyCode)}`}
              />''',
    '''              <Tooltip
                content={`${item.label}: ${formatMoneyMinor(item.value, currencyCode)}`}
                side="top"
              >
                <div
                  className="h-full rounded-full bg-[var(--app-accent-500)]"
                  style={{ width: `${Math.max(2, (Math.abs(item.value) / maximum) * 100)}%` }}
                  tabIndex={0}
                />
              </Tooltip>'''
)

# --- Music legacy form select. ---
path = 'src/renderer/src/modules/music/components/MusicFormPage.tsx'
add_after(path, "import { createMusicItemInputSchema } from '../../../../../shared/validation/music'\n", "import { AppSelect } from '../../../shared/ui/AppSelect'\n")
replace_once(
    path,
    '''              <select
                value={draft.rating}
                className={inputClassName}
                onChange={(event) => patch({ rating: event.target.value })}
              >
                <option value="">Без оценки</option>
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating} / 10
                  </option>
                ))}
              </select>''',
    '''              <AppSelect
                ariaLabel="Оценка музыки"
                value={draft.rating || 'none'}
                triggerClassName={inputClassName}
                options={[
                  { value: 'none', label: 'Без оценки' },
                  ...[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((rating) => ({
                    value: String(rating),
                    label: `${rating} / 10`
                  }))
                ]}
                onValueChange={(value) => patch({ rating: value === 'none' ? '' : value })}
              />'''
)

# --- Diary dates and native tooltips. ---
path = 'src/renderer/src/modules/diary/components/DiaryCalendar.tsx'
add_after(path, "import type { DiaryDaySummary, DiarySummary } from '../../../../../shared/contracts/diary'\n", "import { Tooltip } from '../../../shared/ui/tooltip'\n")
replace_once(
    path,
    '''                    {page?.mood && (
                      <span
                        className={`flex size-8 items-center justify-center rounded-xl text-xl leading-none ${today ? 'bg-violet-500/10' : 'bg-[var(--app-overlay-faint)]'}`}
                        title={diaryMoodMeta[page.mood].label}
                        aria-label={diaryMoodMeta[page.mood].label}
                      >
                        {diaryMoodMeta[page.mood].emoji}
                      </span>
                    )}''',
    '''                    {page?.mood && (
                      <Tooltip content={diaryMoodMeta[page.mood].label} side="top">
                        <span
                          className={`flex size-8 items-center justify-center rounded-xl text-xl leading-none ${today ? 'bg-violet-500/10' : 'bg-[var(--app-overlay-faint)]'}`}
                          aria-label={diaryMoodMeta[page.mood].label}
                        >
                          {diaryMoodMeta[page.mood].emoji}
                        </span>
                      </Tooltip>
                    )}'''
)

path = 'src/renderer/src/modules/diary/components/DiaryReports.tsx'
add_after(path, "import type {\n", "")
text = read(path)
anchor = "} from '../../../../../shared/contracts/diary'\n"
if "shared/ui/AppDateField" not in text:
    text = text.replace(anchor, anchor + "import { AppDateField } from '../../../shared/ui/AppDateField'\nimport { Tooltip } from '../../../shared/ui/tooltip'\n")
write(path, text)
regex_once(
    path,
    r'''<input\s+type="date"\s+value=\{customFrom\}.*?/>''',
    '''<AppDateField
              ariaLabel="С даты"
              value={customFrom}
              onChange={setCustomFrom}
            />'''
)
regex_once(
    path,
    r'''<input\s+type="date"\s+value=\{customTo\}.*?/>''',
    '''<AppDateField
              ariaLabel="По дату"
              value={customTo}
              onChange={setCustomTo}
            />'''
)
replace_once(
    path,
    '''                    <div
                      key={point.dayKey}
                      title={`${point.dayKey}: ${point.entryCount} записей${point.mood ? ` · ${diaryMoodMeta[point.mood].label}` : ''}`}
                      className={`aspect-square min-h-4 rounded-[5px] border border-violet-500/10 ${level === 0 ? 'bg-[var(--app-overlay-faint)]' : level === 1 ? 'bg-violet-500/20' : level === 2 ? 'bg-violet-500/35' : level === 3 ? 'bg-violet-500/55' : 'bg-violet-500/80'}`}
                    />''',
    '''                    <Tooltip
                      key={point.dayKey}
                      content={`${point.dayKey}: ${point.entryCount} записей${point.mood ? ` · ${diaryMoodMeta[point.mood].label}` : ''}`}
                      side="top"
                    >
                      <div
                        aria-label={`${point.dayKey}: ${point.entryCount} записей`}
                        tabIndex={0}
                        className={`aspect-square min-h-4 rounded-[5px] border border-violet-500/10 ${level === 0 ? 'bg-[var(--app-overlay-faint)]' : level === 1 ? 'bg-violet-500/20' : level === 2 ? 'bg-violet-500/35' : level === 3 ? 'bg-violet-500/55' : 'bg-violet-500/80'}`}
                      />
                    </Tooltip>'''
)

path = 'src/renderer/src/modules/diary/components/DiarySettings.tsx'
add_after(path, "import { useState } from 'react'\n", "\nimport { Tooltip } from '../../../shared/ui/tooltip'\n")
# Both tone pickers use the same native title pattern; wrap every matching button.
text = read(path)
pattern = re.compile(r'''(\s+)(<button\s+key=\{tone\}\s+type="button"\s+aria-pressed=\{selected\}\s+)title=\{meta\.description\}(\s+className=\{`relative flex min-h-24.*?</button>)''', re.S)

def wrap_diary_tone(match: re.Match[str]) -> str:
    indent = match.group(1)
    button = match.group(2) + match.group(3)
    return f'''{indent}<Tooltip content={{meta.description}} side="top">\n{indent}  {button.strip()}\n{indent}</Tooltip>'''

text, count = pattern.subn(wrap_diary_tone, text)
if count != 2:
    raise RuntimeError(f'{path}: expected two diary tone title buttons, got {count}')
write(path, text)

# --- Habit report date fields and heatmap tooltip. ---
path = 'src/renderer/src/modules/habits/components/HabitReports.tsx'
add_after(path, "import { AppSelect } from '../../../shared/ui/AppSelect'\n", "import { AppDateField } from '../../../shared/ui/AppDateField'\nimport { Tooltip } from '../../../shared/ui/tooltip'\n")
regex_once(
    path,
    r'''<input\s+type="date"\s+value=\{customFrom\}.*?/>''',
    '''<AppDateField
                  ariaLabel="Начало периода отчёта привычек"
                  value={customFrom}
                  max={customTo}
                  onChange={setCustomFrom}
                />'''
)
regex_once(
    path,
    r'''<input\s+type="date"\s+value=\{customTo\}.*?/>''',
    '''<AppDateField
                  ariaLabel="Конец периода отчёта привычек"
                  value={customTo}
                  min={customFrom}
                  max={today}
                  onChange={setCustomTo}
                />'''
)
replace_once(
    path,
    '''              {report.days.map((day) => (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.completionRate}% · выполнено ${day.completed}, пропущено ${day.missed}, осознанно пропущено ${day.skipped}`}
                  aria-label={`${day.date}: выполнение ${day.completionRate}%`}
                  className={cn(
                    'aspect-square min-h-2 rounded-[4px] border border-white/[0.03]',
                    heatClass(day.scheduled, day.completionRate, day.missed)
                  )}
                />
              ))}''',
    '''              {report.days.map((day) => (
                <Tooltip
                  key={day.date}
                  content={`${day.date}: ${day.completionRate}% · выполнено ${day.completed}, пропущено ${day.missed}, осознанно пропущено ${day.skipped}`}
                  side="top"
                >
                  <div
                    aria-label={`${day.date}: выполнение ${day.completionRate}%`}
                    tabIndex={0}
                    className={cn(
                      'aspect-square min-h-2 rounded-[4px] border border-white/[0.03]',
                      heatClass(day.scheduled, day.completionRate, day.missed)
                    )}
                  />
                </Tooltip>
              ))}'''
)

# --- Habit preferred time uses shared Radix selects instead of platform time picker. ---
path = 'src/renderer/src/modules/habits/components/HabitPreferredTimesEditor.tsx'
add_after(path, "import type { HabitTrackingType } from '../../../../../shared/contracts/habits'\n", "import { AppTimeField } from '../../../shared/ui/AppTimeField'\n")
regex_once(
    path,
    r'''<input\s+type="time"\s+value=\{values\[unit\] \?\? ''\}.*?/>''',
    '''<AppTimeField
              value={values[unit] ?? ''}
              ariaLabel={
                trackingType === 'check'
                  ? 'Предпочтительное время привычки'
                  : `Предпочтительное время для единицы ${unit}`
              }
              onChange={(value) => onChange(unit, value)}
            />'''
)

# --- Nutrition shared checkbox and report dates. ---
path = 'src/renderer/src/modules/nutrition/components/NutritionFormPrimitives.tsx'
replace_once(path, "import type { ReactNode } from 'react'\n", "import { useId, type ReactNode } from 'react'\n\nimport { AppCheckbox } from '../../../shared/ui/AppCheckbox'\n")
regex_once(
    path,
    r'''export function NutritionCheckField\(\{.*?\n\}\n\nexport function NutritionSecondaryButton''',
    '''export function NutritionCheckField({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}): React.JSX.Element {
  const id = useId()
  return (
    <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--app-muted)]">
      <AppCheckbox id={id} ariaLabel={label} checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  )
}

export function NutritionSecondaryButton'''
)

path = 'src/renderer/src/modules/nutrition/components/NutritionProgressView.tsx'
add_after(path, "import type { NutritionMealType, NutritionReport } from '../../../../../shared/contracts/nutrition'\n", "import { AppDateField } from '../../../shared/ui/AppDateField'\n")
regex_once(
    path,
    r'''<input\s+type="date"\s+value=\{dateFrom\}.*?/>''',
    '''<AppDateField
            ariaLabel="Начало периода"
            value={dateFrom}
            onChange={onDateFromChange}
          />'''
)
regex_once(
    path,
    r'''<input\s+type="date"\s+value=\{dateTo\}.*?/>''',
    '''<AppDateField ariaLabel="Конец периода" value={dateTo} onChange={onDateToChange} />'''
)

# --- Password generator: Radix Slider + shared Checkbox. ---
path = 'src/renderer/src/modules/passwords/components/PasswordItemDialog.tsx'
add_after(path, "import { AppDialog } from '../../../shared/ui/AppDialog'\n", "import { AppCheckbox } from '../../../shared/ui/AppCheckbox'\nimport { AppSlider } from '../../../shared/ui/AppSlider'\n")
replace_once(
    path,
    '''            <input
              type="range"
              min={8}
              max={64}
              value={generatorLength}
              className="mt-4 w-full accent-violet-500"
              onChange={(event) => setGeneratorLength(Number(event.target.value))}
            />''',
    '''            <AppSlider
              ariaLabel="Длина генерируемого пароля"
              min={8}
              max={64}
              value={generatorLength}
              className="mt-4"
              onValueChange={setGeneratorLength}
            />'''
)
regex_once(
    path,
    r'''\]\.map\(\(\[label, checked, setter\]\) => \(\s*<label\s+key=\{String\(label\)\}.*?</label>\s*\)\)''',
    '''].map(([label, checked, setter], index) => {
              const optionId = `password-generator-option-${index}`
              return (
                <label
                  key={String(label)}
                  htmlFor={optionId}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 py-2 text-xs text-[var(--app-muted)]"
                >
                  <AppCheckbox
                    id={optionId}
                    ariaLabel={String(label)}
                    checked={Boolean(checked)}
                    onCheckedChange={(nextChecked) =>
                      (setter as React.Dispatch<React.SetStateAction<boolean>>)(nextChecked)
                    }
                  />
                  {String(label)}
                </label>
              )
            })'''
)

# --- Settings appearance uses Radix RadioGroup cards. ---
path = 'src/renderer/src/modules/settings/AppearanceSettingsSection.tsx'
text = read(path)
if "@radix-ui/react-radio-group" not in text:
    text = "import * as RadioGroup from '@radix-ui/react-radio-group'\n" + text
write(path, text)
regex_once(
    path,
    r'''<div className="grid grid-cols-3 gap-3 max-\[680px\]:grid-cols-1">\s*\{APP_THEME_OPTIONS\.map\(\(option\) => \{(.*?)\}\)\}\s*</div>''',
    '''<RadioGroup.Root
              value={preferences.theme}
              aria-label="Тема"
              className="grid grid-cols-3 gap-3 max-[680px]:grid-cols-1"
              onValueChange={(value) => {
                const option = APP_THEME_OPTIONS.find((item) => item.value === value)
                if (option) setTheme(option.value)
              }}
            >
              {APP_THEME_OPTIONS.map((option) => {
                const Icon = THEME_ICONS[option.value]
                const selected = preferences.theme === option.value

                return (
                  <RadioGroup.Item
                    key={option.value}
                    value={option.value}
                    aria-label={option.label}
                    className={cn(
                      'relative flex min-h-24 cursor-pointer flex-col rounded-xl border p-3.5 text-left transition-[border-color,background-color,transform] outline-none',
                      'focus-visible:ring-2 focus-visible:ring-violet-500/50',
                      selected
                        ? 'border-violet-500/45 bg-violet-500/10'
                        : 'border-[var(--app-border)] bg-[var(--app-workspace)] hover:-translate-y-px hover:border-[var(--app-border-strong)]'
                    )}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <Icon aria-hidden="true" className="size-5 shrink-0 text-violet-300" />
                      {selected && (
                        <span className="flex size-5 items-center justify-center rounded-full bg-violet-500 text-white">
                          <Check aria-hidden="true" className="size-3" />
                        </span>
                      )}
                    </span>

                    <span className="mt-auto pt-4 text-sm font-medium text-[var(--app-text)]">
                      {option.label}
                    </span>
                  </RadioGroup.Item>
                )
              })}
            </RadioGroup.Root>'''
)
regex_once(
    path,
    r'''<div className="grid grid-cols-5 gap-2 max-\[680px\]:grid-cols-2">\s*\{APP_ACCENT_OPTIONS\.map\(\(option\) => \{(.*?)\}\)\}\s*</div>''',
    '''<RadioGroup.Root
              value={preferences.accent}
              aria-label="Акцентный цвет"
              className="grid grid-cols-5 gap-2 max-[680px]:grid-cols-2"
              onValueChange={(value) => {
                const option = APP_ACCENT_OPTIONS.find((item) => item.value === value)
                if (option) setAccent(option.value)
              }}
            >
              {APP_ACCENT_OPTIONS.map((option) => {
                const selected = preferences.accent === option.value

                return (
                  <RadioGroup.Item
                    key={option.value}
                    value={option.value}
                    aria-label={option.label}
                    className={cn(
                      'flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border p-2.5 transition-[border-color,background-color,transform] outline-none',
                      'focus-visible:ring-2 focus-visible:ring-violet-500/50',
                      selected
                        ? 'border-violet-500/45 bg-violet-500/10'
                        : 'border-[var(--app-border)] bg-[var(--app-workspace)] hover:-translate-y-px hover:border-[var(--app-border-strong)]'
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-8 shrink-0 items-center justify-center rounded-full shadow-sm shadow-black/20"
                      style={{ backgroundColor: option.preview }}
                    >
                      {selected && <Check className="size-4 text-white" />}
                    </span>
                    <span className="truncate text-[11px] font-medium text-[var(--app-text)]">
                      {option.label}
                    </span>
                  </RadioGroup.Item>
                )
              })}
            </RadioGroup.Root>'''
)

# --- Study native tooltips. ---
path = 'src/renderer/src/modules/study/components/BlockSettingsPanel.tsx'
add_after(path, "import type { StudyAssetKind, StudyBlock } from '../../../../../shared/contracts/study'\n", "import { Tooltip } from '../../../shared/ui/tooltip'\n")
replace_once(
    path,
    '''          <p title={definition.label} className="truncate text-sm font-medium text-(--app-text)">
            {definition.label}
          </p>''',
    '''          <Tooltip content={definition.label} side="top">
            <p className="truncate text-sm font-medium text-(--app-text)" tabIndex={0}>
              {definition.label}
            </p>
          </Tooltip>'''
)
replace_once(
    path,
    '''                <p
                  title={localAsset.name}
                  className="block w-full truncate text-xs font-medium text-(--app-text)"
                >
                  {localAsset.name}
                </p>''',
    '''                <Tooltip content={localAsset.name} side="top">
                  <p
                    className="block w-full truncate text-xs font-medium text-(--app-text)"
                    tabIndex={0}
                  >
                    {localAsset.name}
                  </p>
                </Tooltip>'''
)

path = 'src/renderer/src/modules/study/components/StudyBlockEditor.tsx'
add_after(path, "import { AutoGrowTextarea } from '../../../shared/ui/AutoGrowTextarea'\n", "import { Tooltip } from '../../../shared/ui/tooltip'\n")
replace_once(
    path,
    '''          <button
            type="button"
            aria-label={`Перетащить блок «${blockLabel}»`}
            title="Перетащить блок"
            disabled={dragDisabled}''',
    '''          <Tooltip content="Перетащить блок" side="top">
            <button
              type="button"
              aria-label={`Перетащить блок «${blockLabel}»`}
              disabled={dragDisabled}'''
)
replace_once(
    path,
    '''          </button>
          <Collapsible.Trigger asChild>''',
    '''            </button>
          </Tooltip>
          <Collapsible.Trigger asChild>'''
)

path = 'src/renderer/src/modules/study/components/StudyReadNavigation.tsx'
add_after(path, "import { cn } from '../../../shared/lib/cn'\n", "import { Tooltip } from '../../../shared/ui/tooltip'\n")
replace_once(
    path,
    '''                <li key={heading.id}>
                  <button
                    type="button"
                    title={title}''',
    '''                <li key={heading.id}>
                  <Tooltip content={title} side="right">
                    <button
                      type="button"'''
)
# Close the tooltip immediately after the navigation button in each list item.
replace_once(
    path,
    '''                    </span>
                  </button>
                </li>''',
    '''                    </span>
                    </button>
                  </Tooltip>
                </li>'''
)

path = 'src/renderer/src/modules/study/components/code-mode/StudyCodeFindReplace.tsx'
for label, token in [
    ('Учитывать регистр', 'Aa'),
    ('Только целые слова', 'ab'),
    ('Регулярное выражение', '.*')
]:
    old = f'''                <button\n                  type="button"\n                  aria-label="{label}"'''.replace('\\n', '\n')
    new = f'''                <Tooltip content="{label}" side="top">\n                  <button\n                    type="button"\n                    aria-label="{label}"'''.replace('\\n', '\n')
    replace_once(path, old, new)
    replace_once(path, f'''                  title="{label}"\n''', '')
    replace_once(path, f'''                >\n                  {token}\n                </button>''', f'''                  >\n                    {token}\n                  </button>\n                </Tooltip>''')
replace_once(
    path,
    '''              <span
                aria-live="polite"
                className={cn(
                  'w-[84px] shrink-0 text-center text-[11px]',
                  result.error ? 'text-red-300' : 'text-[var(--app-muted)]'
                )}
                title={result.error ?? undefined}
              >
                {resultLabel}
              </span>''',
    '''              {result.error ? (
                <Tooltip content={result.error} side="top">
                  <span
                    aria-live="polite"
                    tabIndex={0}
                    className={cn(
                      'w-[84px] shrink-0 text-center text-[11px]',
                      'text-red-300'
                    )}
                  >
                    {resultLabel}
                  </span>
                </Tooltip>
              ) : (
                <span
                  aria-live="polite"
                  className="w-[84px] shrink-0 text-center text-[11px] text-[var(--app-muted)]"
                >
                  {resultLabel}
                </span>
              )}'''
)
replace_once(
    path,
    '''            {result.error && (
              <p
                className="mt-1.5 truncate pl-[34px] text-[11px] text-red-300"
                title={result.error}
              >
                {result.error}
              </p>
            )}''',
    '''            {result.error && (
              <Tooltip content={result.error} side="bottom">
                <p
                  className="mt-1.5 truncate pl-[34px] text-[11px] text-red-300"
                  tabIndex={0}
                >
                  {result.error}
                </p>
              </Tooltip>
            )}'''
)

path = 'src/renderer/src/modules/study/components/code-mode/StudyCodeWorkspace.tsx'
replace_once(
    path,
    '''            <span className="truncate" title={visibleDiagnostics[0].message}>
              Строка {visibleDiagnostics[0].line}:{visibleDiagnostics[0].column} —{' '}
              {visibleDiagnostics[0].message}
            </span>''',
    '''            <Tooltip content={visibleDiagnostics[0].message} side="top">
              <span className="truncate" tabIndex={0}>
                Строка {visibleDiagnostics[0].line}:{visibleDiagnostics[0].column} —{' '}
                {visibleDiagnostics[0].message}
              </span>
            </Tooltip>'''
)

path = 'src/renderer/src/modules/study/components/file/StudyFileBlockView.tsx'
add_after(path, "import { cn } from '../../../../shared/lib/cn'\n", "import { Tooltip } from '../../../../shared/ui/tooltip'\n")
replace_once(path, '                title={expandImageLabel}\n', '')
replace_once(path, '                  title={collapseImageLabel}\n', '')
# Compose Radix tooltip with Radix dialog triggers.
replace_once(
    path,
    '''            <Dialog.Trigger asChild>
              <button''',
    '''            <Tooltip content={expandImageLabel} side="top">
              <Dialog.Trigger asChild>
                <button'''
)
replace_once(
    path,
    '''              </button>
            </Dialog.Trigger>''',
    '''                </button>
              </Dialog.Trigger>
            </Tooltip>'''
)
replace_once(
    path,
    '''              <Dialog.Close asChild>
                <button''',
    '''              <Tooltip content={collapseImageLabel} side="bottom">
                <Dialog.Close asChild>
                  <button'''
)
replace_once(
    path,
    '''                </button>
              </Dialog.Close>''',
    '''                  </button>
                </Dialog.Close>
              </Tooltip>'''
)

# ToggleGroup items in source blocks used native browser title; keep Radix item, add Radix tooltip.
for path in [
    'src/renderer/src/modules/study/components/markdown/StudyMarkdownBlock.tsx',
    'src/renderer/src/modules/study/components/latex/StudyLatexBlock.tsx',
    'src/renderer/src/modules/study/components/mermaid/StudyMermaidBlock.tsx'
]:
    text = read(path)
    tooltip_import = "import { Tooltip } from '../../../../shared/ui/tooltip'\n"
    if 'shared/ui/tooltip' not in text:
        text = text.replace("import { cn } from '../../../../shared/lib/cn'\n", "import { cn } from '../../../../shared/lib/cn'\n" + tooltip_import)
    # Wrap each mapped ToggleGroup.Item and drop the native title prop.
    text = text.replace(
        '''                  <ToggleGroup.Item
                    key={value}
                    value={value}
                    aria-label={label}
                    title={label}''',
        '''                  <Tooltip content={label} side="top">
                    <ToggleGroup.Item
                      key={value}
                      value={value}
                      aria-label={label}'''
    )
    text = text.replace(
        '''                  </ToggleGroup.Item>
                ))}''',
        '''                    </ToggleGroup.Item>
                  </Tooltip>
                ))}'''
    )
    write(path, text)

# Markdown task-list checkbox uses shared Radix Checkbox.
path = 'src/renderer/src/modules/study/components/markdown/StudyMarkdownBlock.tsx'
text = read(path)
if "shared/ui/AppCheckbox" not in text:
    text = text.replace("import { cn } from '../../../../shared/lib/cn'\n", "import { cn } from '../../../../shared/lib/cn'\nimport { AppCheckbox } from '../../../../shared/ui/AppCheckbox'\n")
write(path, text)
replace_once(
    path,
    '''    return <input type="checkbox" checked={checked} disabled readOnly />''',
    '''    return (
      <AppCheckbox
        ariaLabel={checked ? 'Задача выполнена' : 'Задача не выполнена'}
        checked={Boolean(checked)}
        disabled
        className="mr-1 inline-flex align-middle"
        onCheckedChange={() => undefined}
      />
    )'''
)

# --- Task group color browser titles -> shared tooltip. ---
path = 'src/renderer/src/modules/tasks/components/TaskGroupDialog.tsx'
add_after(path, "import { AppDialog } from '../../../shared/ui/AppDialog'\n", "import { Tooltip } from '../../../shared/ui/tooltip'\n")
replace_once(
    path,
    '''              return (
                <button
                  key={option.value}
                  type="button"
                  aria-label={`Цвет: ${option.label}`}
                  aria-pressed={color === option.value}
                  title={option.label}''',
    '''              return (
                <Tooltip content={option.label} side="top">
                  <button
                    key={option.value}
                    type="button"
                    aria-label={`Цвет: ${option.label}`}
                    aria-pressed={color === option.value}'''
)
replace_once(
    path,
    '''                </button>
              )
            })}''',
    '''                  </button>
                </Tooltip>
              )
            })}'''
)

print('Radix consistency migration applied successfully')
