from pathlib import Path

path = Path('src/renderer/src/modules/calendar/CalendarPage.test.tsx')
text = path.read_text(encoding='utf-8')
old = "    expect(screen.getByLabelText('Год начала')).toHaveValue(year - 5)\n"
new = "    expect(screen.getByLabelText('Год начала')).toHaveValue(Number(todayKey().slice(0, 4)) - 5)\n"
if old not in text:
    raise SystemExit('calendar start year assertion marker not found')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
