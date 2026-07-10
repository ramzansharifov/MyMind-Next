import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { StudyBlock } from '../../../../../../shared/contracts/study'
import { formatStudyFileSize } from './file-utils'
import { StudyFileBlockView } from './StudyFileBlockView'

type ImageBlock = Extract<StudyBlock, { type: 'image' }>

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
      altText: 'Учебная диаграмма'
    }

    render(<StudyFileBlockView block={block} />)

    expect(
      screen.getByRole('img', {
        name: 'Учебная диаграмма'
      })
    ).toHaveAttribute('src', block.source.type === 'local' ? block.source.asset?.url : '')
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

  it('formats file sizes', () => {
    expect(formatStudyFileSize(1024)).toBe('1.0 КБ')

    expect(formatStudyFileSize(10 * 1024 * 1024)).toBe('10 МБ')
  })
})
