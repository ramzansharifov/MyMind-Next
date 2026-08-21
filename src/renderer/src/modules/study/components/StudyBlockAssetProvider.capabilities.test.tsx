import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useRichTextInternalLinksEnabled } from './rich-text/RichTextCapabilities'
import { StudyBlockAssetProvider } from './StudyBlockAssetProvider'

function CapabilityProbe(): React.JSX.Element {
  return (
    <span data-testid="internal-links-capability">
      {useRichTextInternalLinksEnabled() ? 'enabled' : 'disabled'}
    </span>
  )
}

describe('StudyBlockAssetProvider capabilities', () => {
  it('keeps internal links enabled when the integration does not opt out', () => {
    render(
      <StudyBlockAssetProvider client={{ importAsset: vi.fn(), openAsset: vi.fn() }}>
        <CapabilityProbe />
      </StudyBlockAssetProvider>
    )

    expect(screen.getByTestId('internal-links-capability')).toHaveTextContent('enabled')
  })

  it('disables internal links for integrations such as notes', () => {
    render(
      <StudyBlockAssetProvider
        client={{
          importAsset: vi.fn(),
          openAsset: vi.fn(),
          capabilities: { internalLinks: false }
        }}
      >
        <CapabilityProbe />
      </StudyBlockAssetProvider>
    )

    expect(screen.getByTestId('internal-links-capability')).toHaveTextContent('disabled')
  })
})
