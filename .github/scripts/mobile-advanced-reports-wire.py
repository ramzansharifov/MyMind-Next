from pathlib import Path


def replace_between(text: str, start: str, end: str, replacement: str, label: str) -> str:
    start_index = text.find(start)
    end_index = text.find(end, start_index)
    if start_index < 0 or end_index < 0:
        raise SystemExit(f'{label} source anchors not found')
    return text[:start_index] + replacement + text[end_index:]


def wire_nutrition() -> None:
    path = Path('apps/mobile/src/modules/nutrition/NutritionScreen.tsx')
    text = path.read_text()
    import_anchor = "import { NutritionRecipeSheet } from './NutritionRecipeSheet'"
    import_line = "import { NutritionReportsView } from './NutritionReportsView'"
    if import_line not in text:
        if import_anchor not in text:
            raise SystemExit('Nutrition import anchor not found')
        text = text.replace(import_anchor, f'{import_anchor}\n{import_line}', 1)

    text = text.replace(
        "import { choiceField, messageFor, textField, type FormSpec } from '../../shared/ui/form-model'",
        "import { choiceField, textField, type FormSpec } from '../../shared/ui/form-model'",
        1,
    )

    days_ago = (
        'function daysAgoKey(days: number): string {\n'
        '  return shiftDate(localDateKey(), -days)\n'
        '}\n\n'
    )
    text = text.replace(days_ago, '', 1)

    old_report_anchor = '  let report: ReturnType<typeof api.getReport> | null = null'
    if old_report_anchor in text:
        text = replace_between(
            text,
            old_report_anchor,
            '  const tabs: Array<{ key: Tab; label: string }> =',
            '',
            'Nutrition inline report',
        )

    replacement = (
        "  if (tab === 'report') {\n"
        '    return (\n'
        '      <View style={{ flex: 1 }}>\n'
        '        {header}\n'
        '        {overview.error ? <ErrorState message={overview.error} retry={overview.refresh} /> : null}\n'
        '        <NutritionReportsView />\n'
        '      </View>\n'
        '    )\n'
        '  }'
    )
    text = replace_between(
        text,
        "  if (tab === 'report') {",
        '\n\n  const list: ListItem[] =',
        replacement,
        'Nutrition report render',
    )
    path.write_text(text)


def wire_workouts() -> None:
    path = Path('apps/mobile/src/modules/workouts/WorkoutsScreen.tsx')
    text = path.read_text()
    import_anchor = "import { WorkoutSessionSheet } from './WorkoutSessionSheet'"
    import_line = "import { WorkoutReportsView } from './WorkoutReportsView'"
    if import_line not in text:
        if import_anchor not in text:
            raise SystemExit('Workouts import anchor not found')
        text = text.replace(import_anchor, f'{import_anchor}\n{import_line}', 1)

    text = text.replace(
        "import {\n  choiceField,\n  messageFor,\n  textField,\n  type FormField,\n  type FormSpec\n} from '../../shared/ui/form-model'",
        "import { choiceField, textField, type FormField, type FormSpec } from '../../shared/ui/form-model'",
        1,
    )

    local_date_key = (
        'function localDateKey(date = new Date()): string {\n'
        '  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)\n'
        "  return local.toISOString().slice(0, 10)\n"
        '}\n\n'
    )
    text = text.replace(local_date_key, '', 1)

    days_ago = (
        'function daysAgoKey(days: number): string {\n'
        '  const date = new Date()\n'
        '  date.setDate(date.getDate() - days)\n'
        '  return localDateKey(date)\n'
        '}\n\n'
    )
    text = text.replace(days_ago, '', 1)

    old_report_anchor = '  let reportResult: {'
    if old_report_anchor in text:
        text = replace_between(
            text,
            old_report_anchor,
            '  const tabs: Array<{ key: Tab; label: string }> =',
            '',
            'Workout inline report',
        )

    replacement = (
        "  if (tab === 'reports') {\n"
        '    return (\n'
        '      <View style={{ flex: 1 }}>\n'
        '        {header}\n'
        '        {overview.error ? <ErrorState message={overview.error} retry={overview.refresh} /> : null}\n'
        '        <WorkoutReportsView exercises={exercises} programs={programs} />\n'
        '      </View>\n'
        '    )\n'
        '  }'
    )
    text = replace_between(
        text,
        "  if (tab === 'reports') {",
        '\n\n  const listItems: WorkoutListItem[] =',
        replacement,
        'Workout report render',
    )
    path.write_text(text)


wire_nutrition()
wire_workouts()
