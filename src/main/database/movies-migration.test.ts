import Database from 'better-sqlite3'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const statementBreakpoint = '--> statement-breakpoint'

async function executeMigration(sqlite: Database.Database, filename: string): Promise<void> {
  const sql = await readFile(resolve(process.cwd(), 'drizzle', filename), 'utf8')
  for (const statement of sql.split(statementBreakpoint)) {
    const trimmed = statement.trim()
    if (trimmed) sqlite.exec(trimmed)
  }
}

describe('movies metadata migration', () => {
  it('preserves movie data while removing watched date and introducing actors/comments', async () => {
    const sqlite = new Database(':memory:')

    try {
      await executeMigration(sqlite, '0021_movies_module.sql')
      sqlite
        .prepare(
          `INSERT INTO movies (
            id, title, original_title, year, poster_url, director, runtime_minutes,
            genres_json, description, status, favorite, rating, watched_at, notes,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          'movie-1',
          'Интерстеллар',
          'Interstellar',
          2014,
          'https://example.com/poster.jpg',
          'Christopher Nolan',
          169,
          JSON.stringify(['Фантастика']),
          'Описание',
          'watched',
          1,
          9.5,
          1_700_000_000_000,
          'Старое впечатление',
          1,
          2
        )

      await executeMigration(sqlite, '0022_movies_metadata_cleanup.sql')

      const row = sqlite
        .prepare(
          'SELECT title, actors_json, rating, comments FROM movies WHERE id = ?'
        )
        .get('movie-1')
      const columns = sqlite.prepare('PRAGMA table_info(movies)').all() as Array<{ name: string }>

      expect(row).toEqual({
        title: 'Интерстеллар',
        actors_json: '[]',
        rating: 10,
        comments: 'Старое впечатление'
      })
      expect(columns.some((column) => column.name === 'watched_at')).toBe(false)
      expect(columns.some((column) => column.name === 'notes')).toBe(false)
      expect(columns.some((column) => column.name === 'actors_json')).toBe(true)
      expect(columns.some((column) => column.name === 'comments')).toBe(true)
    } finally {
      sqlite.close()
    }
  })

  it('drops legacy ratings for watchlist movies', async () => {
    const sqlite = new Database(':memory:')

    try {
      await executeMigration(sqlite, '0021_movies_module.sql')
      sqlite
        .prepare(
          `INSERT INTO movies (
            id, title, director, genres_json, description, status, favorite,
            rating, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run('movie-2', 'Dune', '', '[]', '', 'watchlist', 0, 8, '', 1, 2)

      await executeMigration(sqlite, '0022_movies_metadata_cleanup.sql')

      expect(sqlite.prepare('SELECT rating FROM movies WHERE id = ?').get('movie-2')).toEqual({
        rating: null
      })
    } finally {
      sqlite.close()
    }
  })
})
