from pathlib import Path

root = Path('.')
page_path = root / 'src/renderer/src/modules/movies/MoviesPage.tsx'
detail_path = root / 'src/renderer/src/modules/movies/components/MovieDetail.tsx'
test_path = root / 'src/renderer/src/modules/movies/MoviesPage.test.tsx'

page = page_path.read_text()
page = page.replace(
    "import { Bookmark, Check, Film, Heart, Image, LoaderCircle, Plus, Search, Star } from 'lucide-react'",
    "import {\n  ArrowLeft,\n  Bookmark,\n  Check,\n  Film,\n  Heart,\n  Image,\n  LoaderCircle,\n  Pencil,\n  Plus,\n  Search,\n  Star,\n  Trash2\n} from 'lucide-react'"
)

format_runtime = '''function formatRuntime(minutes: number | null): string | null {\n  if (minutes === null) return null\n  const hours = Math.floor(minutes / 60)\n  const rest = minutes % 60\n  if (hours === 0) return `${rest} мин.`\n  if (hours === 0) return `${rest} мин.`\n  return rest > 0 ? `${hours} ч ${rest} мин.` : `${hours} ч`\n}\n\n'''
if format_runtime in page:
    page = page.replace(format_runtime, '')
else:
    page = page.replace('''function formatRuntime(minutes: number | null): string | null {\n  if (minutes === null) return null\n  const hours = Math.floor(minutes / 60)\n  const rest = minutes % 60\n  if (hours === 0) return `${rest} мин.`\n  return rest > 0 ? `${hours} ч ${rest} мин.` : `${hours} ч`\n}\n\n''', '')

old_title = '''              <div>\n                <h1 className="text-2xl font-semibold tracking-tight text-[var(--app-text)]">\n                  Фильмы\n                </h1>\n                <p className="mt-1 text-xs text-[var(--app-muted)]">\n                  Личная библиотека просмотренного и будущих просмотров\n                </p>\n              </div>'''
new_title = '''              <h1 className="text-2xl font-semibold tracking-tight text-[var(--app-text)]">\n                Фильмы\n              </h1>'''
if old_title not in page:
    raise SystemExit('Movies header title block not found')
page = page.replace(old_title, new_title)

old_actions = '''            {view.kind === 'library' && (\n              <button\n                type="button"\n                className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-400"\n                onClick={() => setView({ kind: 'form', movieId: null })}\n              >\n                <Plus className="size-4" /> Добавить фильм\n              </button>\n            )}'''
new_actions = '''            <div className="flex flex-wrap items-center justify-end gap-2">\n              {view.kind === 'library' && (\n                <button\n                  type="button"\n                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-400"\n                  onClick={() => setView({ kind: 'form', movieId: null })}\n                >\n                  <Plus className="size-4" /> Добавить фильм\n                </button>\n              )}\n\n              {view.kind === 'detail' && activeMovie && (\n                <>\n                  <button\n                    type="button"\n                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"\n                    onClick={() => setView({ kind: 'library' })}\n                  >\n                    <ArrowLeft className="size-4" /> К библиотеке\n                  </button>\n                  <button\n                    type="button"\n                    disabled={isSaving}\n                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-50"\n                    onClick={() => setView({ kind: 'form', movieId: activeMovie.id })}\n                  >\n                    <Pencil className="size-4" /> Изменить\n                  </button>\n                  <button\n                    type="button"\n                    disabled={isSaving}\n                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"\n                    onClick={() => setDeleteTarget(activeMovie)}\n                  >\n                    <Trash2 className="size-4" /> Удалить\n                  </button>\n                </>\n              )}\n            </div>'''
if old_actions not in page:
    raise SystemExit('Movies header actions block not found')
page = page.replace(old_actions, new_actions)

old_detail_props = '''          <MovieDetail\n            movie={activeMovie}\n            busy={isSaving}\n            onBack={() => setView({ kind: 'library' })}\n            onEdit={() => setView({ kind: 'form', movieId: activeMovie.id })}\n            onDelete={() => setDeleteTarget(activeMovie)}\n            onUpdate={updateMovie}\n          />'''
new_detail_props = '''          <MovieDetail movie={activeMovie} busy={isSaving} onUpdate={updateMovie} />'''
if old_detail_props not in page:
    raise SystemExit('MovieDetail usage not found')
page = page.replace(old_detail_props, new_detail_props)

page = page.replace('''                {visibleMovies.map((movie) => {\n                  const runtime = formatRuntime(movie.runtimeMinutes)\n                  return (''', '''                {visibleMovies.map((movie) => {\n                  return (''')

old_card_start = '''                    <article key={movie.id} className="group min-w-0">\n                      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)] transition-[transform,border-color,box-shadow] duration-200 group-hover:-translate-y-1 group-hover:border-violet-500/25 group-hover:shadow-xl motion-reduce:transition-none">'''
new_card_start = '''                    <article key={movie.id} className="group min-w-0">\n                      <div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)] transition-[transform,border-color,box-shadow] duration-200 group-hover:-translate-y-1 group-hover:border-violet-500/25 group-hover:shadow-xl motion-reduce:transition-none">\n                        <div className="relative aspect-[2/3] overflow-hidden bg-[var(--app-surface)]">'''
if old_card_start not in page:
    raise SystemExit('Movie card start not found')
page = page.replace(old_card_start, new_card_start)

old_card_end = '''                        </div>\n                      </div>\n\n                      <button\n                        type="button"\n                        className="mt-3 block w-full min-w-0 text-left outline-none"\n                        onClick={() => setView({ kind: 'detail', movieId: movie.id })}\n                      >\n                        <span className="block truncate text-sm font-semibold text-[var(--app-text)] transition-colors group-hover:text-violet-200">\n                          {movie.title}\n                        </span>\n                        <span className="mt-1 flex items-center gap-1.5 truncate text-xs text-[var(--app-muted)]">\n                          {movie.year ?? 'Год не указан'}\n                          {runtime && (\n                            <>\n                              <span>·</span>\n                              <span>{runtime}</span>\n                            </>\n                          )}\n                        </span>\n                      </button>\n                    </article>'''
new_card_end = '''                        </div>\n                        <button\n                          type="button"\n                          className="flex min-h-13 w-full min-w-0 items-center border-t border-[var(--app-border)] bg-[var(--app-surface)] px-3.5 py-3 text-left outline-none transition-colors hover:bg-[var(--app-control-hover)] focus-visible:bg-[var(--app-control-hover)]"\n                          onClick={() => setView({ kind: 'detail', movieId: movie.id })}\n                        >\n                          <span className="block truncate text-sm font-semibold text-[var(--app-text)] transition-colors group-hover:text-violet-200">\n                            {movie.title}\n                          </span>\n                        </button>\n                      </div>\n                    </article>'''
if old_card_end not in page:
    raise SystemExit('Movie card end not found')
page = page.replace(old_card_end, new_card_end)
page_path.write_text(page)

# Move detail navigation/edit/delete actions out of MovieDetail and into the shared module header.
detail = detail_path.read_text()
for name in ['  ArrowLeft,\n', '  Pencil,\n', '  Trash2,\n']:
    detail = detail.replace(name, '')
detail = detail.replace('''  onBack: () => void\n  onEdit: () => void\n  onDelete: () => void\n''', '')
detail = detail.replace('''  busy,\n  onBack,\n  onEdit,\n  onDelete,\n  onUpdate\n''', '''  busy,\n  onUpdate\n''')
old_top_actions = '''      <section className="space-y-5">\n        <div className="flex flex-wrap items-center justify-between gap-3">\n          <button\n            type="button"\n            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"\n            onClick={onBack}\n          >\n            <ArrowLeft className="size-4" /> К библиотеке\n          </button>\n          <div className="flex flex-wrap gap-2">\n            <button\n              type="button"\n              disabled={busy}\n              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-50"\n              onClick={onEdit}\n            >\n              <Pencil className="size-4" /> Изменить\n            </button>\n            <button\n              type="button"\n              disabled={busy}\n              className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"\n              onClick={onDelete}\n            >\n              <Trash2 className="size-4" /> Удалить\n            </button>\n          </div>\n        </div>\n\n        <div className="overflow-hidden rounded-[28px] border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]">'''
new_top_actions = '''      <section>\n        <div className="overflow-hidden rounded-[28px] border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]">'''
if old_top_actions not in detail:
    raise SystemExit('MovieDetail top actions not found')
detail = detail.replace(old_top_actions, new_top_actions)
detail_path.write_text(detail)

# Extend UI tests for the cleaned header and integrated movie card footer.
test = test_path.read_text()
test = test.replace(
    "import { render, screen, waitFor } from '@testing-library/react'",
    "import { render, screen, waitFor } from '@testing-library/react'"
)
anchor = "describe('MoviesPage', () => {\n"
new_test = '''  it('keeps the module header clean and puts movie actions into it', async () => {\n    const user = userEvent.setup()\n    mocks.listOverview.mockResolvedValue({ movies: [movie] })\n\n    const { container } = render(<MoviesPage />)\n\n    await screen.findByRole('button', { name: 'Открыть фильм «Интерстеллар»' })\n    expect(\n      screen.queryByText('Личная библиотека просмотренного и будущих просмотров')\n    ).not.toBeInTheDocument()\n    expect(screen.queryByText('2014')).not.toBeInTheDocument()\n\n    const movieTitleButton = screen.getByRole('button', { name: 'Интерстеллар' })\n    expect(movieTitleButton.parentElement).toHaveClass('overflow-hidden')\n\n    await user.click(screen.getByRole('button', { name: 'Открыть фильм «Интерстеллар»' }))\n    const header = container.querySelector('header')\n    expect(header).not.toBeNull()\n    expect(header).toContainElement(screen.getByRole('button', { name: 'К библиотеке' }))\n    expect(header).toContainElement(screen.getByRole('button', { name: 'Изменить' }))\n    expect(header).toContainElement(screen.getByRole('button', { name: 'Удалить' }))\n  })\n\n'''
if anchor not in test:
    raise SystemExit('MoviesPage test describe block not found')
test = test.replace(anchor, anchor + new_test, 1)
test_path.write_text(test)
