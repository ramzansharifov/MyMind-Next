from pathlib import Path

path = Path('src/renderer/src/modules/movies/components/MovieJsonImportDialog.tsx')
text = path.read_text()
text = text.replace('export function parseMoviesJson(value: string): ParseResult {', 'function parseMoviesJson(value: string): ParseResult {')
path.write_text(text)
