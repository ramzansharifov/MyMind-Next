import type { DiarySummary } from '../../../../../shared/contracts/diary'
import { getDiaryPaperStyle } from '../lib/diary-paper'

const PAPER_STACK_LAYERS = [1, 2, 3, 4, 5] as const

export function DiaryPaperStack({
  paperTone
}: {
  paperTone: DiarySummary['paperTone']
}): React.JSX.Element {
  const paperStyle = getDiaryPaperStyle(paperTone)

  return (
    <>
      {PAPER_STACK_LAYERS.map((layer) => (
        <div
          key={layer}
          aria-hidden="true"
          className={`diary-paper-stack-layer diary-paper-stack-layer--${layer}`}
          style={paperStyle}
        />
      ))}
    </>
  )
}
