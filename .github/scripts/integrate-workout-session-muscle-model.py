from pathlib import Path

page_path = Path('src/renderer/src/modules/workouts/WorkoutsPage.tsx')
test_path = Path('src/renderer/src/modules/workouts/WorkoutsPage.test.tsx')
page = page_path.read_text(encoding='utf-8')
test = test_path.read_text(encoding='utf-8')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f'Не найден фрагмент для {label}')
    return text.replace(old, new, 1)


if "./components/WorkoutProgramMuscleMapDialog" in page:
    page = replace_once(
        page,
        "import { WorkoutProgramMuscleMapDialog } from './components/WorkoutProgramMuscleMapDialog'\n",
        "import { WorkoutMuscleMapDialog } from './components/WorkoutMuscleMapDialog'\n",
        'импорта универсальной модели'
    )

if 'sessionMuscleMapOpen' not in page:
    page = replace_once(
        page,
        "  const [selectedProgramForMap, setSelectedProgramForMap] = useState<WorkoutProgramRecord | null>(\n    null\n  )\n  const [sessionDialogOpen, setSessionDialogOpen] = useState(false)\n",
        "  const [selectedProgramForMap, setSelectedProgramForMap] = useState<WorkoutProgramRecord | null>(\n    null\n  )\n  const [sessionMuscleMapOpen, setSessionMuscleMapOpen] = useState(false)\n  const [selectedSessionForMap, setSelectedSessionForMap] = useState<WorkoutSessionRecord | null>(null)\n  const [sessionDialogOpen, setSessionDialogOpen] = useState(false)\n",
        'состояния модели тренировки'
    )

thumbnail = '''                      <button
                        type="button"
                        className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1"
                        onClick={() => {
                          setSelectedSession(session)
                          setSessionDetailOpen(true)
                        }}
                      >
                        <WorkoutMuscleArtwork groups={groups} className="size-9 rounded-lg" />
                      </button>
'''
if thumbnail in page:
    page = page.replace(thumbnail, '', 1)

model_button_marker = '''                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label="Изменить тренировку"
'''
if 'Посмотреть модель мышц тренировки' not in page:
    model_button = '''                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Посмотреть модель мышц тренировки «${session.programName || formatDate(session.date)}»`}
                          className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-violet-500/10 hover:text-violet-300"
                          onClick={() => {
                            setSelectedSessionForMap(session)
                            setSessionMuscleMapOpen(true)
                          }}
                        >
                          <Activity className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Изменить тренировку"
'''
    page = replace_once(page, model_button_marker, model_button, 'кнопки модели тренировки')

old_dialog = '''      <WorkoutProgramMuscleMapDialog
        open={programMuscleMapOpen}
        program={selectedProgramForMap}
        exercises={exercises}
        onOpenChange={(open) => {
          setProgramMuscleMapOpen(open)
          if (!open) setSelectedProgramForMap(null)
        }}
      />
'''
if old_dialog in page:
    new_dialogs = '''      <WorkoutMuscleMapDialog
        open={programMuscleMapOpen}
        title={selectedProgramForMap ? `Карта мышц · ${selectedProgramForMap.name}` : 'Карта мышц программы'}
        description="Поверните модель и посмотрите, какие группы мышц задействует программа. Яркость показывает, в скольких упражнениях встречается зона."
        exercises={
          selectedProgramForMap?.exercises.flatMap((item) => {
            const exercise = exerciseMap.get(item.exerciseId)
            return exercise ? [{ title: exercise.title, muscleGroups: exercise.muscleGroups }] : []
          }) ?? []
        }
        emptyMessage="В программе пока нет упражнений с указанными группами мышц."
        onOpenChange={(open) => {
          setProgramMuscleMapOpen(open)
          if (!open) setSelectedProgramForMap(null)
        }}
      />
      <WorkoutMuscleMapDialog
        open={sessionMuscleMapOpen}
        title={
          selectedSessionForMap
            ? `Модель мышц · ${selectedSessionForMap.programName || 'Свободная тренировка'}`
            : 'Модель мышц тренировки'
        }
        description={
          selectedSessionForMap
            ? `Мышцы, задействованные в тренировке за ${formatDate(selectedSessionForMap.date)}. Яркость показывает, в скольких упражнениях встречается зона.`
            : 'Посмотрите, какие мышцы были задействованы в выбранной тренировке.'
        }
        exercises={
          selectedSessionForMap?.exercises.map((exercise) => ({
            title: exercise.exerciseTitle,
            muscleGroups: exercise.muscleGroups
          })) ?? []
        }
        emptyMessage="В этой тренировке нет упражнений с указанными группами мышц."
        onOpenChange={(open) => {
          setSessionMuscleMapOpen(open)
          if (!open) setSelectedSessionForMap(null)
        }}
      />
'''
    page = page.replace(old_dialog, new_dialogs, 1)

page_path.write_text(page, encoding='utf-8')

if "opens the full muscle model from the workout journal" not in test:
    marker = "  it('shows the fixed muscle tag in the exercise library', async () => {\n"
    addition = '''  it('opens the full muscle model from the workout journal', async () => {
    const user = userEvent.setup()
    render(<WorkoutsPage />)

    await user.click(
      await screen.findByRole('button', { name: 'Посмотреть модель мышц тренировки «Pull»' })
    )

    expect(await screen.findByText('Модель мышц · Pull')).toBeInTheDocument()
    expect(screen.getAllByText('Бицепс').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Спереди' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows the fixed muscle tag in the exercise library', async () => {
'''
    test = replace_once(test, marker, addition, 'теста модели тренировки')
    test_path.write_text(test, encoding='utf-8')
