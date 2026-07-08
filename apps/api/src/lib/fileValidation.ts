/**
 * File upload validation helpers.
 *
 * Whitelist approach: only known, safe file extensions and MIME types are
 * accepted. Executable, script, and HTML types are rejected even if the
 * extension is disguised.
 */

export const ALLOWED_FILE_EXTENSIONS = new Set([
  // Images
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  'bmp',
  'tiff',
  'ico',
  // Documents
  'pdf',
  'txt',
  'md',
  'csv',
  'json',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'odt',
  'ods',
  'odp',
  'rtf',
  // Archives
  'zip',
  'gz',
  'tar',
  'rar',
  '7z',
  // Media
  'mp3',
  'wav',
  'ogg',
  'mp4',
  'webm',
  'mov',
  'avi',
  'mkv',
])

export const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'image/x-icon',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
  'application/rtf',
  'application/zip',
  'application/gzip',
  'application/x-tar',
  'application/vnd.rar',
  'application/x-7z-compressed',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'application/octet-stream',
])

export const BLOCKED_MIME_PREFIXES = [
  'application/x-msdownload',
  'application/x-sh',
  'text/x-shellscript',
  'application/x-bat',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-httpd-php',
  'application/x-javascript',
  'text/javascript',
  'text/html',
  'application/xhtml+xml',
  'text/x-ms-frag',
]

export const BLOCKED_EXTENSIONS = new Set([
  'exe',
  'dll',
  'bat',
  'cmd',
  'sh',
  'bin',
  'app',
  'dmg',
  'pkg',
  'deb',
  'rpm',
  'msi',
  'jar',
  'wsf',
  'vbs',
  'js',
  'jsx',
  'ts',
  'tsx',
  'php',
  'phtml',
  'php3',
  'php4',
  'php5',
  'pl',
  'py',
  'rb',
  'cgi',
  'html',
  'htm',
  'xhtml',
  'shtml',
])

export function getFileExtension(name: string): string {
  const parts = name.split('.')
  if (parts.length < 2) return ''
  return parts[parts.length - 1].toLowerCase().trim()
}

export function sanitizeFileName(name: string): string {
  // Remove path traversal characters and control characters
  const withoutPath = name.replace(/\\/g, '/').split('/').pop() || ''
  const sanitized = withoutPath
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/[<>:"|?*]/g, '_')
    .trim()
  return sanitized || 'unnamed-file'
}

export function isAllowedFile(name: string, mimeType: string): boolean {
  const ext = getFileExtension(name)
  const normalizedMime = (mimeType || '').toLowerCase().trim()

  if (ext && BLOCKED_EXTENSIONS.has(ext)) return false
  if (BLOCKED_MIME_PREFIXES.some((prefix) => normalizedMime.startsWith(prefix))) return false

  if (ext && ALLOWED_FILE_EXTENSIONS.has(ext)) return true
  if (normalizedMime && ALLOWED_MIME_TYPES.has(normalizedMime)) return true

  return false
}
