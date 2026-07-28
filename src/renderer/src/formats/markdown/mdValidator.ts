import type { ValidationResult } from '../types'

/**
 * Markdown's forgiving, degrade-to-plain-text parsing model has no
 * DOM-like tree to structurally validate the way xmlValidator.ts does.
 * A full grammar checker is out of scope for now — this always reports
 * valid, matching the pre-existing behavior of never blocking a
 * Markdown open/drop.
 */
export function validateMarkdown(_source: string): ValidationResult {
  return { valid: true, errors: [] }
}
