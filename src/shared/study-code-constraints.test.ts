import { describe, expect, it } from 'vitest'

import { validateStudyCodeConstraints } from './study-code-constraints'

describe('study Code Mode constraint diagnostics', () => {
  it('points Mermaid scale errors to the actual attribute and explains the valid range', () => {
    const source = `@version(1)\n\nmaterial "Лекция" {\n  heading 1 "Введение"\n\n  mermaid view="preview" theme="dark" scale=1 """\n    flowchart LR\n      A --> B\n  """\n}\n`

    const diagnostics = validateStudyCodeConstraints(source)

    expect(diagnostics[0]).toMatchObject({
      line: 6,
      message: 'Mermaid: масштаб должен быть от 60 до 180%'
    })
    expect(diagnostics[0]?.column).toBe(source.split('\n')[5].indexOf('scale=') + 1)
    expect(diagnostics[0]?.message).not.toContain('Too small')
  })

  it('covers the numeric ranges used by LaTeX, images and dividers', () => {
    const source = `@version(1)\n\nmaterial "Лекция" {\n  latex scale=60 """\n    x^2\n  """\n\n  image url="https://example.com/image.png" height=100\n\n  divider thickness=13\n}\n`

    const diagnostics = validateStudyCodeConstraints(source)

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ line: 4, message: 'LaTeX: масштаб должен быть от 70 до 180%' }),
        expect.objectContaining({ line: 8, message: 'Изображение: высота должна быть от 180 до 720 px' }),
        expect.objectContaining({
          line: 10,
          message: 'Разделитель: толщина должна быть целым числом от 1 до 12'
        })
      ])
    )
  })

  it('explains colors, enums and remote media URLs in user-facing language', () => {
    const source = `@version(1)\n\nmaterial "Лекция" {\n  heading 1 "Цвет" color="red"\n\n  markdown view="reader" """\n    Текст\n  """\n\n  video url="https://example.com/video"\n}\n`

    const diagnostics = validateStudyCodeConstraints(source)

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          line: 4,
          message: 'Параметр color должен быть цветом в формате #RRGGBB'
        }),
        expect.objectContaining({
          line: 6,
          message: 'Параметр view: допустимые значения — write, split, preview'
        }),
        expect.objectContaining({ line: 10, message: 'Видео: укажите корректную ссылку YouTube' })
      ])
    )
  })

  it('does not silently ignore detached local-asset metadata or unknown attributes', () => {
    const source = `@version(1)\n\nmaterial "Лекция" {\n  image name="photo.png" mime="image/png" size=100\n\n  divider opacity=0.5\n}\n`

    const diagnostics = validateStudyCodeConstraints(source)

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          line: 4,
          message: 'Параметры name, mime и size используются только вместе с asset'
        }),
        expect.objectContaining({ line: 6, message: 'Неизвестный параметр «opacity»' })
      ])
    )
  })

  it('accepts the values used by normal visual blocks', () => {
    const source = `@version(1)\n\nmaterial "Лекция" {\n  heading 1 "Заголовок" color="#FFFFFF" background="#7C3AED"\n\n  latex view="preview" display="display" align="center" scale=100 """\n    x^2\n  """\n\n  mermaid view="preview" theme="forest" scale=100 """\n    flowchart LR\n      A --> B\n  """\n\n  image url="https://example.com/image.png" fit="contain" height=360\n  divider variant="tapered" thickness=4 color="#A78BFA"\n}\n`

    expect(validateStudyCodeConstraints(source)).toEqual([])
  })
})
