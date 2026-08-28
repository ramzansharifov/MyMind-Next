from pathlib import Path

page = Path('src/renderer/src/modules/workouts/WorkoutsPage.tsx')
text = page.read_text(encoding='utf-8')

import_anchor = "import { WorkoutSessionDialog } from './components/WorkoutSessionDialog'\n"
card_import = "import { WorkoutSessionCard } from './components/WorkoutSessionCard'\n"
if card_import not in text:
    if import_anchor not in text:
        raise SystemExit('WorkoutSessionDialog import anchor not found')
    text = text.replace(import_anchor, card_import + import_anchor, 1)

text = text.replace(
    "  workoutMuscleGroupsLabel,\n  WorkoutMuscleGroupIcon\n",
    "  workoutMuscleGroupsLabel\n",
    1,
)

start_marker = '            <div className="space-y-3">\n              {filteredSessions.map((session) => {'
end_marker = '          )}\n        </section>\n      )}'
start = text.find(start_marker)
if start == -1:
    raise SystemExit('session list start not found')
end = text.find(end_marker, start)
if end == -1:
    raise SystemExit('session list end not found')

replacement = '''            <div className="space-y-2.5">
              {filteredSessions.map((session) => (
                <WorkoutSessionCard
                  key={session.id}
                  session={session}
                  onOpenMuscleMap={() => {
                    setSelectedSessionForMap(session)
                    setSessionMuscleMapOpen(true)
                  }}
                  onEdit={() => {
                    setEditingSession(session)
                    setSessionDialogOpen(true)
                  }}
                  onDelete={() => setDeleteSessionTarget(session)}
                />
              ))}
            </div>
'''
text = text[:start] + replacement + text[end:]
page.write_text(text, encoding='utf-8')

card = Path('src/renderer/src/modules/workouts/components/WorkoutSessionCard.tsx')
card_text = card.read_text(encoding='utf-8')
card_target = '''      <div
        id={detailsId}
        className={cn(
'''
card_replacement = '''      <div
        id={detailsId}
        aria-hidden={!expanded}
        inert={!expanded}
        className={cn(
'''
if card_target not in card_text:
    raise SystemExit('card details anchor not found')
card.write_text(card_text.replace(card_target, card_replacement, 1), encoding='utf-8')

test = Path('src/renderer/src/modules/workouts/WorkoutsPage.test.tsx')
test_text = test.read_text(encoding='utf-8')

first_start = test_text.find("  it('shows the workout journal with program and set totals'")
second_start = test_text.find("  it('opens the full muscle model from the workout journal'", first_start)
if first_start == -1 or second_start == -1:
    raise SystemExit('journal tests anchor not found')
new_first = '''  it('keeps workout cards compact and reveals full details on click', async () => {
    const user = userEvent.setup()
    render(<WorkoutsPage />)

    expect(await screen.findByRole('heading', { name: 'Тренировки' })).toBeInTheDocument()
    const toggle = await screen.findByRole('button', { name: 'Раскрыть тренировку «Pull»' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(/10 повт\\. × 16 кг/)).not.toBeInTheDocument()

    await user.click(toggle)

    expect(screen.getByRole('button', { name: 'Свернуть тренировку «Pull»' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    expect(screen.getByText(/10 повт\\. × 16 кг/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Изменить тренировку' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Удалить тренировку' })).toBeInTheDocument()
  })

'''
test_text = test_text[:first_start] + new_first + test_text[second_start:]

old_open = '''    await user.click(
      await screen.findByRole('button', { name: 'Посмотреть модель мышц тренировки «Pull»' })
    )
'''
new_open = '''    await user.click(
      await screen.findByRole('button', { name: 'Раскрыть тренировку «Pull»' })
    )
    await user.click(
      screen.getByRole('button', { name: 'Посмотреть модель мышц тренировки «Pull»' })
    )
'''
if old_open not in test_text:
    raise SystemExit('muscle model open test anchor not found')
test_text = test_text.replace(old_open, new_open, 1)
test.write_text(test_text, encoding='utf-8')
