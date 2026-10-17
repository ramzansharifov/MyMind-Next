'use client'

import dynamic from 'next/dynamic'

const Workspace = dynamic(() => import('../components/PwaApp'), {
  ssr: false,
  loading: () => (
    <div className="startup" role="status">
      Открываем MyMind…
    </div>
  )
})

export default function Page(): React.JSX.Element {
  return <Workspace />
}
