from pathlib import Path

path = Path('src/main/services/calendar-reminder-scheduler.ts')
text = path.read_text(encoding='utf-8')
text = text.replace(
    'markCalendarReminderDelivered(reminder.reminderId, reminder.occurrenceDate)',
    'markCalendarReminderDelivered(reminder)'
)
path.write_text(text, encoding='utf-8')
