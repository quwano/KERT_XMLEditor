import React from 'react'
import type { Block } from '../types/document'
import BlockList from './BlockList'

interface Props {
  blocks: Block[]
  onChange: (blocks: Block[]) => void
}

export default function DocumentEditor({ blocks, onChange }: Props): JSX.Element {
  return (
    <div className="document-editor">
      <BlockList blocks={blocks} onChange={onChange} />
    </div>
  )
}
