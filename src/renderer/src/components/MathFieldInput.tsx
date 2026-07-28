import React, { useEffect, useRef } from 'react'
import { MathfieldElement } from 'mathlive'

// Referencing the import keeps it from being tree-shaken away — evaluating
// the `mathlive` module is what registers the <math-field> custom element.
void MathfieldElement

export interface MathValue {
  formula: string
  mathml: string
}

interface Props {
  formula: string
  onChange: (value: MathValue) => void
  placeholder?: string
}

const MATHML_XMLNS = 'http://www.w3.org/1998/Math/MathML'

/**
 * Wraps MathLive's bare MathML output in a <math> root with a LaTeX
 * <annotation>, mirroring MathEditor's buildSaveMathML — this is what lets
 * the LaTeX source be recovered later from the mathml string alone.
 */
function wrapMathML(inner: string, latex: string): string {
  if (!inner) return ''
  const safeLatex = latex.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<math xmlns="${MATHML_XMLNS}"><semantics><mrow>${inner}</mrow><annotation encoding="application/x-tex">${safeLatex}</annotation></semantics></math>`
}

/**
 * React wrapper around MathLive's <math-field> web component. Ported from
 * MathEditor's src/renderer/editor.ts integration pattern (that file is not
 * imported — only the mounting/event-wiring approach is replicated here).
 * Used by both the math-inline chip dialog and the math-block editor.
 */
export default function MathFieldInput({ formula, onChange, placeholder }: Props): React.ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mfRef = useRef<MathfieldElement | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const mf = document.createElement('math-field') as MathfieldElement
    if (placeholder) mf.setAttribute('placeholder', placeholder)
    mf.setValue(formula)

    const handleInput = (): void => {
      const latex = mf.getValue('latex')
      const ml3 = latex ? mf.getValue('math-ml') : ''
      onChangeRef.current({ formula: latex, mathml: wrapMathML(ml3, latex) })
    }
    mf.addEventListener('input', handleInput)
    container.appendChild(mf)
    mfRef.current = mf

    return () => {
      mf.removeEventListener('input', handleInput)
      container.removeChild(mf)
      mfRef.current = null
    }
    // Mounts the field once; external `formula` changes are re-synced by the
    // effect below rather than remounting, so user keystrokes are never lost.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const mf = mfRef.current
    if (!mf) return
    if (mf.getValue('latex') !== formula) {
      mf.setValue(formula)
    }
  }, [formula])

  return <div className="math-field-input" ref={containerRef} />
}
