import DOMPurify from 'isomorphic-dompurify'

const DOCUMENT_PURIFY_CONFIG = {
  ADD_TAGS: ['iframe'],
  ADD_ATTR: ['style', 'target', 'allow', 'allowfullscreen', 'frameborder', 'scrolling'],
  ALLOW_DATA_ATTR: true,
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return DOMPurify.sanitize(value, DOCUMENT_PURIFY_CONFIG)
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue)
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      result[key] = sanitizeValue(val)
    }
    return result
  }
  return value
}

export function sanitizeDocumentContent(content: unknown): unknown {
  return sanitizeValue(content)
}

export function sanitizeWhiteboardData(data: unknown): unknown {
  if (data === null || data === undefined) return data
  if (typeof data !== 'object') return {}
  return sanitizeValue(data)
}
