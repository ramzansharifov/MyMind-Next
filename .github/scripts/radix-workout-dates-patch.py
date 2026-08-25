from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Pattern not found in {path}: {old[:140]!r}')
    file.write_text(text.replace(old, new), encoding='utf-8')


# Workout session dialog: preserve the native segmented date input, only replace its calendar trigger.
path = 'src/renderer/src/modules/workouts/components/WorkoutSessionDialog.tsx'
replace(
    path,
    "import { AppDialog } from '../../../shared/ui/AppDialog'\n",
    "import { AppDateField } from '../../../shared/ui/AppDateField'\nimport { AppDialog } from '../../../shared/ui/AppDialog'\n",
)
replace(
    path,
    '''            <input
              type="date"
              value={date}
              className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45"
              onChange={(event) => setDate(event.target.value)}
            />''',
    '''            <AppDateField
              value={date}
              ariaLabel="Дата тренировки"
              onChange={setDate}
            />''',
)

# Progress dialog: same shared date field.
path = 'src/renderer/src/modules/workouts/components/WorkoutProgressDialog.tsx'
replace(
    path,
    "import { AppDialog } from '../../../shared/ui/AppDialog'\n",
    "import { AppDateField } from '../../../shared/ui/AppDateField'\nimport { AppDialog } from '../../../shared/ui/AppDialog'\n",
)
replace(
    path,
    '''            <input
              type="date"
              value={date}
              className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45"
              onChange={(event) => setDate(event.target.value)}
            />''',
    '''            <AppDateField
              value={date}
              ariaLabel="Дата прогресса"
              onChange={setDate}
            />''',
)

# Reports: replace both native picker buttons while keeping input[type=date] semantics.
path = 'src/renderer/src/modules/workouts/WorkoutsPage.tsx'
replace(
    path,
    "import { AppSelect } from '../../shared/ui/AppSelect'\n",
    "import { AppDateField } from '../../shared/ui/AppDateField'\nimport { AppSelect } from '../../shared/ui/AppSelect'\n",
)
replace(
    path,
    '''              <input
                type="date"
                aria-label="Начало периода"
                value={reportDateFrom}
                className="h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45"
                onChange={(event) => {
                  setReportPeriod('custom')
                  setReportDateFrom(event.target.value)
                }}
              />''',
    '''              <AppDateField
                value={reportDateFrom}
                ariaLabel="Начало периода"
                className="w-[155px]"
                onChange={(value) => {
                  setReportPeriod('custom')
                  setReportDateFrom(value)
                }}
              />''',
)
replace(
    path,
    '''              <input
                type="date"
                aria-label="Конец периода"
                value={reportDateTo}
                className="h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45"
                onChange={(event) => {
                  setReportPeriod('custom')
                  setReportDateTo(event.target.value)
                }}
              />''',
    '''              <AppDateField
                value={reportDateTo}
                ariaLabel="Конец периода"
                className="w-[155px]"
                onChange={(value) => {
                  setReportPeriod('custom')
                  setReportDateTo(value)
                }}
              />''',
)

# Regression coverage for the 85vh dialog cap.
path = 'src/renderer/src/shared/ui/AppDialog.test.tsx'
replace(
    path,
    "    expect(screen.getByRole('dialog', { name: 'Общий диалог' })).toBeInTheDocument()\n",
    "    expect(screen.getByRole('dialog', { name: 'Общий диалог' })).toBeInTheDocument()\n    expect(screen.getByRole('dialog', { name: 'Общий диалог' })).toHaveClass('max-h-[85vh]')\n",
)

# Workout integration: the report fields remain type=date and expose the new Radix trigger.
path = 'src/renderer/src/modules/workouts/WorkoutsPage.test.tsx'
replace(
    path,
    """    expect(screen.getByText('Лучшие показатели')).toBeInTheDocument()
    expect(screen.getByText('100% · 2 подх. · 22 повт.')).toBeInTheDocument()
""",
    """    expect(screen.getByText('Лучшие показатели')).toBeInTheDocument()
    expect(screen.getByText('100% · 2 подх. · 22 повт.')).toBeInTheDocument()
    expect(screen.getByLabelText('Начало периода')).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText('Конец периода')).toHaveAttribute('type', 'date')

    await user.click(
      screen.getByRole('button', { name: 'Открыть календарь для поля «Начало периода»' })
    )
    expect(await screen.findByTestId('app-date-field-popover')).toBeInTheDocument()
""",
)

# The only date inputs in the workout flows must now come from AppDateField.
for target in [
    'src/renderer/src/modules/workouts/WorkoutsPage.tsx',
    'src/renderer/src/modules/workouts/components/WorkoutSessionDialog.tsx',
    'src/renderer/src/modules/workouts/components/WorkoutProgressDialog.tsx',
]:
    source = Path(target).read_text(encoding='utf-8')
    if 'type="date"' in source:
        raise SystemExit(f'Native date field remained outside AppDateField: {target}')

print('Radix workout date field integration applied successfully.')
