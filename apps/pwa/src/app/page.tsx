'use client'

import dynamic from 'next/dynamic'
import { PwaLoading } from '../components/PwaLoading'

const Workspace = dynamic(() => import('../components/PwaApp'), {
  ssr: false,
  loading: () => <PwaLoading message="Открываем MyMind" />
})

export default function Page(): React.JSX.Element {
  return <Workspace />
}
