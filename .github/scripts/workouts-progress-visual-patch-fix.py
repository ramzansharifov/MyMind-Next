from pathlib import Path

path = Path('.github/scripts/workouts-progress-visual-patch.py')
source = path.read_text(encoding='utf-8')
old = '''start_marker = "      {tab === 'progress' && (\\n"
end_marker = "      {tab === 'reports' && (\\n"
start = s.find(start_marker)
end = s.find(end_marker, start + len(start_marker))
if start < 0 or end < 0:
    raise RuntimeError('Could not locate Progress tab block')
'''
new = '''start_marker = "      {tab === 'progress' && (\\n"
end_marker = "      {tab === 'reports' && (\\n"
progress_occurrences = []
search_from = 0
while True:
    candidate = s.find(start_marker, search_from)
    if candidate < 0:
        break
    progress_occurrences.append(candidate)
    search_from = candidate + len(start_marker)
if len(progress_occurrences) != 2:
    raise RuntimeError(
        f'Expected header and content Progress markers, got {len(progress_occurrences)}'
    )
start = progress_occurrences[1]
end = s.find(end_marker, start + len(start_marker))
if end < 0:
    raise RuntimeError('Could not locate Reports tab after Progress content')
'''
if source.count(old) != 1:
    raise RuntimeError(f'Expected one Progress marker block, got {source.count(old)}')
path.write_text(source.replace(old, new, 1), encoding='utf-8')
