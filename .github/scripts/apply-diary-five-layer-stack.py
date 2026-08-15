from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'{label} anchor not found')
    return text.replace(old, new, 1)


today = Path('src/renderer/src/modules/diary/components/DiaryToday.tsx')
text = today.read_text()
text = replace_once(
    text,
    "import { getDiaryPaperStyle } from '../lib/diary-paper'\n",
    "import { getDiaryPaperStyle } from '../lib/diary-paper'\nimport { DiaryPaperStack } from './DiaryPaperStack'\n",
    'DiaryToday import',
)
text = replace_once(
    text,
    '        <span className="diary-back-binding" aria-hidden="true" />\n',
    '        <span className="diary-back-binding" aria-hidden="true" />\n        <DiaryPaperStack paperTone={diary.paperTone} />\n',
    'DiaryToday stack',
)
today.write_text(text)

reader = Path('src/renderer/src/modules/diary/components/DiaryReader.tsx')
text = reader.read_text()
text = replace_once(
    text,
    "import { getDiaryPaperStyle } from '../lib/diary-paper'\n",
    "import { getDiaryPaperStyle } from '../lib/diary-paper'\nimport { DiaryPaperStack } from './DiaryPaperStack'\n",
    'DiaryReader import',
)
text = replace_once(
    text,
    '        <span className="diary-back-binding" aria-hidden="true" />\n',
    '        <span className="diary-back-binding" aria-hidden="true" />\n        <DiaryPaperStack paperTone={diary.paperTone} />\n',
    'DiaryReader stack',
)
reader.write_text(text)

css = Path('src/renderer/src/modules/diary/diary-leather-cover.css')
text = css.read_text()
text = replace_once(
    text,
    '  padding: 0.92rem 0.92rem 1.2rem 1.28rem;',
    '  padding: 4.5px;',
    'desktop book padding',
)

start = text.index('.diary-premium-book::before {')
end = text.index('\n\n.diary-back-binding {', start)
layers = '''.diary-premium-book::before,
.diary-premium-book::after {
  display: none;
}

.diary-paper-stack-layer {
  position: absolute;
  pointer-events: none;
  border-style: solid;
  border-width: 1px;
  border-radius: 1.48rem 1.66rem 1.66rem 1.36rem;
  box-shadow: 0 1px 2px rgb(20 13 7 / 12%);
}

.diary-paper-stack-layer--1 {
  inset: 2px;
  z-index: 1;
  border-color: color-mix(in srgb, var(--diary-paper-deep) 72%, black 28%);
  background: color-mix(in srgb, var(--diary-paper-deep) 78%, black 22%);
}

.diary-paper-stack-layer--2 {
  inset: 2.5px;
  z-index: 2;
  border-color: color-mix(in srgb, var(--diary-paper-deep) 78%, black 22%);
  background: color-mix(in srgb, var(--diary-paper-deep) 84%, black 16%);
}

.diary-paper-stack-layer--3 {
  inset: 3px;
  z-index: 3;
  border-color: color-mix(in srgb, var(--diary-paper-deep) 84%, black 16%);
  background: color-mix(in srgb, var(--diary-paper-deep) 90%, black 10%);
}

.diary-paper-stack-layer--4 {
  inset: 3.5px;
  z-index: 4;
  border-color: color-mix(in srgb, var(--diary-paper-deep) 90%, black 10%);
  background: color-mix(in srgb, var(--diary-paper-deep) 82%, var(--diary-paper) 18%);
}

.diary-paper-stack-layer--5 {
  inset: 4px;
  z-index: 5;
  border-color: color-mix(in srgb, var(--diary-paper-deep) 82%, var(--diary-paper) 18%);
  background: color-mix(in srgb, var(--diary-paper) 78%, var(--diary-paper-deep) 22%);
}'''
text = text[:start] + layers + text[end:]

text = replace_once(text, '  inset: 0 0 0.28rem 0;', '  inset: 0;', 'cover inset')
text = replace_once(
    text,
    '  z-index: 3;\n  border-color: #b89560;',
    '  z-index: 6;\n  border-color: #b89560;',
    'paper z-index',
)

anchor = '.diary-premium-paper::before {\n'
if anchor not in text:
    raise SystemExit('reader stage CSS anchor not found')
text = text.replace(
    anchor,
    '.diary-premium-book .diary-reader-page-stage {\n  z-index: 6;\n}\n\n' + anchor,
    1,
)

text = replace_once(
    text,
    '''  .diary-premium-book {
    padding: 0.75rem 0.7rem 1rem 1rem;
  }
''',
    '''  .diary-premium-book {
    padding: 4.5px;
  }
''',
    '760px book padding',
)
text = text.replace(
    '''
  .diary-premium-book::before {
    top: 0.9rem;
    right: 0.42rem;
    bottom: 0.72rem;
    left: 1.1rem;
  }

  .diary-premium-book::after {
    top: 0.86rem;
    right: 0.54rem;
    bottom: 0.84rem;
    left: 1.06rem;
  }
''',
    '\n',
    1,
)
text = replace_once(
    text,
    '''  .diary-premium-book {
    padding: 0.5rem 0.44rem 0.72rem 0.7rem;
  }
''',
    '''  .diary-premium-book {
    padding: 4.5px;
  }
''',
    '620px book padding',
)
text = text.replace(
    '''
  .diary-premium-book::before {
    top: 0.62rem;
    right: 0.24rem;
    bottom: 0.52rem;
    left: 0.76rem;
  }

  .diary-premium-book::after {
    top: 0.58rem;
    right: 0.34rem;
    bottom: 0.62rem;
    left: 0.72rem;
  }
''',
    '\n',
    1,
)

css.write_text(text)
