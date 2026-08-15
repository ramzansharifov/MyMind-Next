from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'{label} anchor not found')
    return text.replace(old, new, 1)


css = Path('src/renderer/src/modules/diary/diary-leather-cover.css')
text = css.read_text()

text = replace_once(
    text,
    "  --diary-cover-spine-dark: #2a160c;\n\n  position: relative;",
    "  --diary-cover-spine-dark: #2a160c;\n  --diary-stack-top: 1.06rem;\n  --diary-stack-right: 0.58rem;\n  --diary-stack-bottom: 0.86rem;\n  --diary-stack-left: 1.42rem;\n  --diary-stack-page-offset: 12.5px;\n  --diary-page-vertical-inset: calc(\n    var(--diary-stack-top) + var(--diary-stack-bottom) + 25px\n  );\n\n  position: relative;",
    'stack variables',
)

text = replace_once(
    text,
    '  padding: 4.5px;\n',
    '''  padding:\n    calc(var(--diary-stack-top) + var(--diary-stack-page-offset))\n    calc(var(--diary-stack-right) + var(--diary-stack-page-offset))\n    calc(var(--diary-stack-bottom) + var(--diary-stack-page-offset))\n    calc(var(--diary-stack-left) + var(--diary-stack-page-offset));\n''',
    'book padding',
)

replacements = {
    '  inset: 2px;\n': '''  inset:\n    var(--diary-stack-top) var(--diary-stack-right) var(--diary-stack-bottom)\n    var(--diary-stack-left);\n''',
    '  inset: 2.5px;\n': '''  inset:\n    calc(var(--diary-stack-top) + 2.5px) calc(var(--diary-stack-right) + 2.5px)\n    calc(var(--diary-stack-bottom) + 2.5px) calc(var(--diary-stack-left) + 2.5px);\n''',
    '  inset: 3px;\n': '''  inset:\n    calc(var(--diary-stack-top) + 5px) calc(var(--diary-stack-right) + 5px)\n    calc(var(--diary-stack-bottom) + 5px) calc(var(--diary-stack-left) + 5px);\n''',
    '  inset: 3.5px;\n': '''  inset:\n    calc(var(--diary-stack-top) + 7.5px) calc(var(--diary-stack-right) + 7.5px)\n    calc(var(--diary-stack-bottom) + 7.5px) calc(var(--diary-stack-left) + 7.5px);\n''',
    '  inset: 4px;\n': '''  inset:\n    calc(var(--diary-stack-top) + 10px) calc(var(--diary-stack-right) + 10px)\n    calc(var(--diary-stack-bottom) + 10px) calc(var(--diary-stack-left) + 10px);\n''',
}
for old, new in replacements.items():
    text = replace_once(text, old, new, f'layer inset {old.strip()}')

text = replace_once(
    text,
    '''@media (max-width: 760px) {\n  .diary-premium-book {\n    padding: 4.5px;\n  }\n''',
    '''@media (max-width: 760px) {\n  .diary-premium-book {\n    --diary-stack-top: 0.9rem;\n    --diary-stack-right: 0.42rem;\n    --diary-stack-bottom: 0.72rem;\n    --diary-stack-left: 1.1rem;\n  }\n''',
    '760px stack geometry',
)

text = replace_once(
    text,
    '''@media (max-width: 620px) {\n  .diary-premium-book {\n    padding: 4.5px;\n  }\n''',
    '''@media (max-width: 620px) {\n  .diary-premium-book {\n    --diary-stack-top: 0.62rem;\n    --diary-stack-right: 0.24rem;\n    --diary-stack-bottom: 0.52rem;\n    --diary-stack-left: 0.76rem;\n  }\n''',
    '620px stack geometry',
)

css.write_text(text)

reader_css = Path('src/renderer/src/modules/diary/diary-reader-behavior.css')
text = reader_css.read_text()
text = replace_once(
    text,
    '  height: calc(90vh - 2.12rem);',
    '  height: calc(90vh - var(--diary-page-vertical-inset, 3.5rem));',
    'reader height',
)
text = replace_once(
    text,
    '''@media (max-width: 620px) {\n  .diary-reader-page-stage {\n    height: calc(90vh - 1.22rem);\n  }\n}\n''',
    '',
    'obsolete mobile reader height',
)
reader_css.write_text(text)
