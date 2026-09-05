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
        .prepare('SELECT title, actors_json, rating, comments FROM movies WHERE id = ?')
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

  it('adds content type and defaults existing records to movie', async () => {
    const sqlite = new Database(':memory:')

    try {
      await executeMigration(sqlite, '0021_movies_module.sql')
      await executeMigration(sqlite, '0022_movies_metadata_cleanup.sql')
      sqlite
        .prepare(
          `INSERT INTO movies (
            id, title, director, genres_json, actors_json, description, status, favorite,
            comments, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run('movie-3', 'Arrival', '', '[]', '[]', '', 'watchlist', 0, '', 1, 2)

      await executeMigration(sqlite, '0023_movies_content_type.sql')

      expect(sqlite.prepare('SELECT type FROM movies WHERE id = ?').get('movie-3')).toEqual({
        type: 'movie'
      })
      const typeColumn = (sqlite.prepare('PRAGMA table_info(movies)').all() as Array<{
        name: string
        notnull: number
        dflt_value: string | null
      }>).find((column) => column.name === 'type')
      expect(typeColumn).toMatchObject({ name: 'type', notnull: 1, dflt_value: "'movie'" })
    } finally {
      sqlite.close()
    }
  })

  it('adds episodic metadata, moves series runtime and removes legacy anime type', async () => {
    const sqlite = new Database(':memory:')

    try {
      await executeMigration(sqlite, '0021_movies_module.sql')
      await executeMigration(sqlite, '0022_movies_metadata_cleanup.sql')
      await executeMigration(sqlite, '0023_movies_content_type.sql')

      const insert = sqlite.prepare(
        `INSERT INTO movies (
          id, title, type, director, runtime_minutes, genres_json, actors_json, description,
          status, favorite, comments, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      insert.run(
        'series-1',
        'Series',
        'series',
        '',
        45,
        '[]',
        '[]',
        '',
        'watchlist',
        0,
        '',
        1,
        2
      )
      insert.run(
        'anime-1',
        'Legacy anime',
        'anime',
        '',
        120,
        '[]',
        '[]',
        '',
        'watchlist',
        0,
        '',
        1,
        2
      )

      await executeMigration(sqlite, '0024_series_metadata.sql')

      expect(
        sqlite
          .prepare(
            `SELECT type, runtime_minutes, season_count, episodes_per_season,
              episode_runtime_minutes FROM movies WHERE id = ?`
          )
          .get('series-1')
      ).toEqual({
        type: 'series',
        runtime_minutes: null,
        season_count: null,
        episodes_per_season: null,
        episode_runtime_minutes: 45
      })
      expect(sqlite.prepare('SELECT type FROM movies WHERE id = ?').get('anime-1')).toEqual({
        type: 'movie'
      })

      const columns = sqlite.prepare('PRAGMA table_info(movies)').all() as Array<{ name: string }>
      expect(columns.some((column) => column.name === 'season_count')).toBe(true)
      expect(columns.some((column) => column.name === 'episodes_per_season')).toBe(true)
      expect(columns.some((column) => column.name === 'episode_runtime_minutes')).toBe(true)
    } finally {
      sqlite.close()
    }
  })
})
