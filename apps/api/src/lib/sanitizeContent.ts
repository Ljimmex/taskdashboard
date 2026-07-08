import sanitizeHtml from 'sanitize-html'

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [...(sanitizeHtml.defaults.allowedTags || []), 'iframe'],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    iframe: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'scrolling'],
    '*': ['style', 'class', 'id'],
  },
  allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'youtu.be'],
  allowProtocolRelative: false,
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeHtml(value, SANITIZE_OPTIONS)
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
