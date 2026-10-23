import { describe, expect, it, vi } from 'vitest'
import { discoverYouTube, parseYouTubeSearch } from './music-youtube'

const video = (id: string, title = 'Music Song') => ({
  videoRenderer: {
    videoId: id,
    title: { runs: [{ text: title }] },
    ownerText: { runs: [{ text: 'Band' }] },
    lengthText: { simpleText: '3:42' },
    thumbnail: { thumbnails: [{ url: 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' }] }
  }
})
describe('anonymous YouTube InnerTube music catalog', () => {
  it('parses nested WEB search renderers and de-duplicates videos', () => {
    const results = parseYouTubeSearch({
      contents: { twoColumnSearchResultsRenderer: { primaryContents: { sectionListRenderer: {
        contents: [{ itemSectionRenderer: { contents: [
          video('abcdefghijk'),
          video('abcdefghijk'),
          video('lmnopqrstuv', 'Other')
        ] } }]
      } } } }
    })
    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({ provider: 'youtube', id: 'abcdefghijk',
      artist: 'Band', durationSeconds: 222 })
    expect(results[0].streamUrl).toBe('https://www.youtube.com/watch?v=abcdefghijk')
  })

  it('skips malformed video IDs and does not construct third-party streams', () => {
    expect(parseYouTubeSearch({ items: [video('bad'), video('abcdefghijk')] })).toHaveLength(1)
  })

  it('uses actual youtubei WEB POST without paid developer API keys', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ contents: [video('abcdefghijk')] }), { status: 200 }))
    const result = await discoverYouTube('  music   ', { fetcher })
    expect(result).toHaveLength(1)
    expect(String(fetcher.mock.calls[0][0])).toContain('youtubei/v1/search')
    const config = fetcher.mock.calls[0][1]!
    expect(config.method).toBe('POST')
    expect(JSON.parse(String(config.body)).query).toBe('music')
    expect(JSON.parse(String(config.body)).context.client.clientName).toBe('WEB')
  })
})
