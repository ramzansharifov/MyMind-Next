'use dom'

import { DomViewportMeta } from './DomViewportMeta'

export default function StudyYouTubeDom({
  embedUrl,
  title,
  dom: _dom
}: {
  embedUrl: string
  title: string
  dom?: import('expo/dom').DOMProps
}): React.JSX.Element {
  return (
    <>
      <DomViewportMeta />
      <main>
        <iframe
          src={embedUrl}
          title={title}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
        <style>{`
        html, body, #root, main {
          margin: 0;
          width: 100%;
          height: 100%;
          min-height: 1px;
          overflow: hidden;
          background: #000;
        }
        * { box-sizing: border-box; }
        iframe {
          display: block;
          width: 100%;
          height: 100%;
          border: 0;
          background: #000;
        }
        `}</style>
      </main>
    </>
  )
}
