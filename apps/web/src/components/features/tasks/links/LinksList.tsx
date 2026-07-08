import { ExternalLink, Trash2, Link as LinkIcon } from 'lucide-react'
import { TaskLink } from '@taskdashboard/types'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

interface LinksListProps {
  links: TaskLink[]
  onDelete?: (linkId: string) => void
  readOnly?: boolean
}

export function LinksList({ links, onDelete, readOnly = false }: LinksListProps) {
  if (links.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <LinkIcon className="mx-auto mb-3 h-12 w-12 opacity-50" />
        <p className="text-sm">Brak linków</p>
        <p className="mt-1 text-xs text-gray-600">
          Kliknij "+ Dodaj link" aby dodać link do tego zadania
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {links.map((link) => (
        <div
          key={link.id}
          className="group flex items-center gap-3 rounded-lg bg-gray-800/50 p-3 transition-colors hover:bg-gray-800/80"
        >
          {/* Link Icon */}
          <LinkIcon className="h-5 w-5 flex-shrink-0 text-blue-400" />

          {/* Link Content */}
          <div className="min-w-0 flex-1">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block flex items-center gap-2 truncate text-sm font-medium text-white transition-colors hover:text-amber-400"
            >
              {link.title || link.url}
              <ExternalLink className="h-3 w-3 opacity-50" />
            </a>
            {link.title && <div className="mt-0.5 truncate text-xs text-gray-500">{link.url}</div>}
            {link.addedAt && (
              <div className="mt-1 text-xs text-gray-600">
                Dodano {format(new Date(link.addedAt), "d MMM yyyy 'o' HH:mm", { locale: pl })}
              </div>
            )}
          </div>

          {/* Delete Button */}
          {!readOnly && onDelete && (
            <button
              onClick={() => onDelete(link.id)}
              className="p-1 text-gray-500 opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
              title="Usuń link"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
