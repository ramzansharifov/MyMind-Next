import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { StudyBlock } from '../../../../../../shared/contracts/study'
import { formatStudyFileSize } from './file-utils'
import { StudyFileBlockView } from './StudyFileBlockView'

type ImageBlock = Extract<StudyBlock, { type: 'image' }>
type VideoBlock = Extract<StudyBlock, { type: 'video' }>
type FileBlock = Extract<StudyBlock, { type: 'file' }>

describe('StudyFileBlockView', () => {
  it('renders a managed local image', () => {
    const block: ImageBlock = {
      id: 'image-block',
      type: 'image',
      source: {
        type: 'local',
        asset: {
          id: '94a8c6c1-41f5-466d-92c4-5199a0754b17',
          materialId: 'material-1',
          name: 'diagram.png',
          mimeType: 'image/png',
          size: 2048,
          url: 'mymind-asset://local/material-1/94a8c6c1-41f5-466d-92c4-5199a0754b17/diagram.png'
        }
      },
      title: 'Учебная схема'
    }

    render(<StudyFileBlockView block={block} />)

    expect(
      screen.getByRole('img', {
        name: 'Учебная схема'
      })
    ).toHaveAttribute('src', block.source.type === 'local' ? block.source.asset?.url : '')

    const image = screen.getByRole('img', {
      name: 'Учебная схема'
    })

    expect(image.closest('figure')?.firstElementChild).toHaveTextContent('Учебная схема')

    expect(screen.queryByText('diagram.png')).not.toBeInTheDocument()

    expect(screen.queryByText('2.0 КБ')).not.toBeInTheDocument()
  })

  it('rejects insecure remote image URLs', () => {
    const block: ImageBlock = {
      id: 'remote-image',
      type: 'image',
      source: {
        type: 'url',
        url: 'http://example.com/image.png'
      }
    }

    render(<StudyFileBlockView block={block} />)

    expect(screen.getByText(/прямая HTTPS-ссылка/i)).toBeInTheDocument()
  })

  it('renders a privacy-enhanced YouTube embed', () => {
    const block: VideoBlock = {
      id: 'youtube-video',
      type: 'video',
      source: {
        type: 'url',
        url: 'https://youtu.be/dQw4w9WgXcQ'
      },
      title: 'Учебное видео'
    }

    render(<StudyFileBlockView block={block} />)

    expect(screen.getByTitle('Учебное видео')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0'
    )
  })

  it('rejects non-YouTube video URLs', () => {
    const block: VideoBlock = {
      id: 'unsupported-video',
      type: 'video',
      source: {
        type: 'url',
        url: 'https://example.com/video.mp4'
      }
    }

    render(<StudyFileBlockView block={block} />)

    expect(screen.getByText(/ссылка на видео YouTube/i)).toBeInTheDocument()
    expect(screen.queryByTitle('Видео')).not.toBeInTheDocument()
  })

  it('opens a managed file with the system default application', async () => {
    const user = userEvent.setup()
    const openAsset = vi.fn().mockResolvedValue(undefined)
    const block: FileBlock = {
      id: 'file-block',
      type: 'file',
      source: {
        type: 'local',
        asset: {
          id: '94a8c6c1-41f5-466d-92c4-5199a0754b17',
          materialId: 'material-1',
          name: 'lecture.pdf',
          mimeType: 'application/pdf',
          size: 4096,
          url: 'mymind-asset://local/material-1/94a8c6c1-41f5-466d-92c4-5199a0754b17/lecture.pdf'
        }
      }
    }

    render(<StudyFileBlockView block={block} onOpenFile={openAsset} />)

    await user.click(screen.getByRole('button', { name: 'Открыть файл «lecture.pdf»' }))

    expect(openAsset).toHaveBeenCalledTimes(1)
    expect(openAsset).toHaveBeenCalledWith({
      id: '94a8c6c1-41f5-466d-92c4-5199a0754b17',
      materialId: 'material-1',
      name: 'lecture.pdf'
    })
  })

  it('shows a system error when a managed file cannot be opened', async () => {
    const user = userEvent.setup()
    const openAsset = vi
      .fn()
      .mockRejectedValue(new Error('Для этого типа файла не назначено приложение'))
    const block: FileBlock = {
      id: 'file-error',
      type: 'file',
      source: {
        type: 'local',
        asset: {
          id: '94a8c6c1-41f5-466d-92c4-5199a0754b17',
          materialId: 'material-1',
          name: 'unknown.data',
          mimeType: 'application/octet-stream',
          size: 128,
          url: 'mymind-asset://local/material-1/94a8c6c1-41f5-466d-92c4-5199a0754b17/unknown.data'
        }
      }
    }

    render(<StudyFileBlockView block={block} onOpenFile={openAsset} />)

    await user.click(screen.getByRole('button', { name: 'Открыть файл «unknown.data»' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Для этого типа файла не назначено приложение'
    )
  })

  it('formats file sizes', () => {
    expect(formatStudyFileSize(1024)).toBe('1.0 КБ')

    expect(formatStudyFileSize(10 * 1024 * 1024)).toBe('10 МБ')
  })
})
