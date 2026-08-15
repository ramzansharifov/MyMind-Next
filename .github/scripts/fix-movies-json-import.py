from pathlib import Path

component = Path('src/renderer/src/modules/movies/components/MovieJsonImportDialog.tsx')
text = component.read_text()
text = text.replace('export function parseMoviesJson(value: string): ParseResult {', 'function parseMoviesJson(value: string): ParseResult {')
component.write_text(text)

test = Path('src/renderer/src/modules/movies/MoviesPage.test.tsx')
text = test.read_text()
text = text.replace(
    "import { render, screen, waitFor } from '@testing-library/react'",
    "import { fireEvent, render, screen, waitFor } from '@testing-library/react'"
)
old = '''    await user.type(\n      input,\n      '```json\\n[{"title":"Интерстеллар","status":"watched","rating":9},{"title":"Дюна"}]\\n```'\n    )'''
new = '''    fireEvent.change(input, {\n      target: {\n        value:\n          '```json\\n[{"title":"Интерстеллар","status":"watched","rating":9},{"title":"Дюна"}]\\n```'\n      }\n    })'''
if old not in text:
    raise SystemExit('JSON import user.type test block not found')
text = text.replace(old, new)
test.write_text(text)
