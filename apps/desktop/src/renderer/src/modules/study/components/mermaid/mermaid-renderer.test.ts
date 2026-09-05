import { describe, expect, it } from 'vitest'

import { getStudyMermaidErrorMessage, sanitizeStudyMermaidSvg } from './mermaid-renderer'

describe('Mermaid renderer safety', () => {
  it('removes scripts, event handlers and external links', () => {
    const svg = sanitizeStudyMermaidSvg(`
      <svg xmlns="http://www.w3.org/2000/svg">
        <script>alert('unsafe')</script>
        <foreignObject>
          <div>unsafe</div>
        </foreignObject>
        <g onclick="alert('unsafe')">
          <a href="javascript:alert('unsafe')">
            <text>Safe label</text>
          </a>
        </g>
      </svg>
    `)

    expect(svg).not.toContain('<script')
    expect(svg).not.toContain('foreignObject')
    expect(svg).not.toContain('onclick')
    expect(svg).not.toContain('javascript:')
    expect(svg).toContain('Safe label')
  })

  it('keeps internal SVG references', () => {
    const svg = sanitizeStudyMermaidSvg(`
      <svg xmlns="http://www.w3.org/2000/svg">
        <defs>
          <path id="shape" d="M0 0" />
        </defs>
        <use href="#shape" />
      </svg>
    `)

    expect(svg).toContain('href="#shape"')
  })

  it('creates a readable error message', () => {
    expect(getStudyMermaidErrorMessage(new Error('Error: Parse error'))).toBe('Parse error')
  })
})
