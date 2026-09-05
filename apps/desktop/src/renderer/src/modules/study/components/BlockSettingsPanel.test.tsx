import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { StudyBlock } from '../../../../../shared/contracts/study'
import { BlockSettingsPanel } from './BlockSettingsPanel'

type VideoBlock = Extract<StudyBlock, { type: 'video' }>

const localVideo: VideoBlock = {
  id: 'video-1',
  type: 'video',
  source: {
    type: 'local',
    asset: {
      id: 'asset-1',
      materialId: 'material-1',
      name: 'lesson.mp4',
      mimeType: 'video/mp4',
      size: 4096,
      url: 'mymind-asset://local/material-1/asset-1/lesson.mp4'
    }
  }
}

describe('BlockSettingsPanel attachment sources', () => {
  it('keeps a saved local video until a YouTube link is explicitly applied', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <BlockSettingsPanel
        materialId="material-1"
        block={localVideo}
        textEditor={null}
        onChange={onChange}
      />
    )

    await user.click(screen.getByRole('radio', { name: 'YouTube' }))
    expect(onChange).not.toHaveBeenCalled()

    const urlInput = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')
    await user.type(urlInput, 'https://youtu.be/dQw4w9WgXcQ')
    expect(onChange).not.toHaveBeenCalled()

    await user.click(screen.getByRole('radio', { name: 'Компьютер' }))
    expect(screen.getByText('lesson.mp4')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()

    await user.click(screen.getByRole('radio', { name: 'YouTube' }))
    expect(screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')).toHaveValue(
      'https://youtu.be/dQw4w9WgXcQ'
    )

    await user.click(screen.getByRole('button', { name: 'Использовать ссылку' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith({
      ...localVideo,
      source: {
        type: 'url',
        url: 'https://youtu.be/dQw4w9WgXcQ'
      }
    })
  })

  it('does not clear a saved URL when the computer tab is opened', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const remoteVideo: VideoBlock = {
      id: 'video-2',
      type: 'video',
      source: {
        type: 'url',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      }
    }

    render(
      <BlockSettingsPanel
        materialId="material-1"
        block={remoteVideo}
        textEditor={null}
        onChange={onChange}
      />
    )

    await user.click(screen.getByRole('radio', { name: 'Компьютер' }))

    expect(screen.getByRole('button', { name: 'Выбрать' })).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()

    await user.click(screen.getByRole('radio', { name: 'YouTube' }))
    expect(screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')).toHaveValue(
      remoteVideo.source.type === 'url' ? remoteVideo.source.url : ''
    )
    expect(onChange).not.toHaveBeenCalled()
  })
})
