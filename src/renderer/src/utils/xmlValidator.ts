/**
 * Custom XSD validator based on document_schema.xsd.
 * Uses DOMParser only — no regex for structural checks.
 */

const VALID_ROOT_CHILDREN = new Set([
  'title1', 'title2', 'title3', 'title4', 'title5', 'p', 'table'
])

const VALID_RICH_TEXT_CHILDREN = new Set([
  'g', 'u', 'yomikae', 'ruby', 'sup', 'sub', 'img'
])

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validateXml(xmlString: string): ValidationResult {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'application/xml')

  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    return {
      valid: false,
      errors: [`XML 解析エラー: ${parseError.textContent?.trim() ?? '不明なエラー'}`]
    }
  }

  const errors: string[] = []
  const root = doc.documentElement

  if (root.tagName !== 'root') {
    return {
      valid: false,
      errors: [`ルート要素は <root> でなければなりません（<${root.tagName}> が見つかりました）`]
    }
  }

  for (const child of Array.from(root.children)) {
    if (!VALID_ROOT_CHILDREN.has(child.tagName)) {
      errors.push(`<root> の子要素として無効: <${child.tagName}>`)
      continue
    }
    if (child.tagName === 'table') {
      validateTable(child, errors)
    } else {
      validateRichText(child, errors)
    }
  }

  return { valid: errors.length === 0, errors }
}

function validateTable(tableEl: Element, errors: string[]): void {
  if (tableEl.children.length === 0) {
    errors.push('<table> には少なくとも 1 つの <tr> が必要です')
    return
  }
  for (const child of Array.from(tableEl.children)) {
    if (child.tagName !== 'tr') {
      errors.push(`<table> の子要素として無効: <${child.tagName}>（<tr> のみ許可）`)
      continue
    }
    validateTr(child, errors)
  }
}

function validateTr(trEl: Element, errors: string[]): void {
  if (trEl.children.length === 0) {
    errors.push('<tr> には少なくとも 1 つの <td> または <th> が必要です')
    return
  }
  for (const child of Array.from(trEl.children)) {
    if (child.tagName !== 'td' && child.tagName !== 'th') {
      errors.push(`<tr> の子要素として無効: <${child.tagName}>（<td> または <th> のみ許可）`)
      continue
    }
    validateRichText(child, errors)
  }
}

function validateRichText(el: Element, errors: string[]): void {
  for (const child of Array.from(el.children)) {
    if (!VALID_RICH_TEXT_CHILDREN.has(child.tagName)) {
      errors.push(`<${el.tagName}> の子要素として無効: <${child.tagName}>`)
      continue
    }
    if (child.tagName === 'img') {
      validateImg(child, errors)
    } else if (child.tagName === 'sup' || child.tagName === 'sub') {
      if (child.children.length > 0) {
        errors.push(`<${child.tagName}> はテキストのみ含むことができます（子要素不可）`)
      }
    } else {
      // g, u, yomikae, ruby — rich_text を再帰的に検証
      validateRichText(child, errors)
    }
  }
}

function validateImg(imgEl: Element, errors: string[]): void {
  if (!imgEl.hasAttribute('src')) {
    errors.push('<img> には必須属性 @src が必要です')
  }
}
