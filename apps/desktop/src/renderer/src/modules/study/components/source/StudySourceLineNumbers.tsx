import { useMemo } from 'react'

import './StudySourceLineNumbers.css'

interface StudySourceLineNumbersProps {
  source: string
}

export function StudySourceLineNumbers({ source }: StudySourceLineNumbersProps): React.JSX.Element {
  const lineNumbers = useMemo(() => createStudySourceLineNumbers(source), [source])
  const lineNumberDigits = Math.max(2, String(lineNumbers.length).length)

  return (
    <div
      aria-hidden="true"
      data-study-source-line-numbers
      className="study-source-line-numbers"
      style={{
        minWidth: `calc(${lineNumberDigits}ch + 1.5rem)`
      }}
    >
      {lineNumbers.map((lineNumber) => (
        <span
          key={lineNumber}
          data-study-source-line-number={lineNumber}
          className="study-source-line-number"
        >
          {lineNumber}
        </span>
      ))}
    </div>
  )
}

function createStudySourceLineNumbers(source: string): number[] {
  const lineCount = source.split('\n').length

  return Array.from(
    {
      length: Math.max(lineCount, 1)
    },
    (_value, index) => index + 1
  )
}
