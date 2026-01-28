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
            <div className="text-center py-12 text-gray-500">
                <LinkIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Brak linków</p>
                <p className="text-xs text-gray-600 mt-1">
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
                    className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800/80 transition-colors group"
                >
                    {/* Link Icon */}
                    <LinkIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />

                    {/* Link Content */}
                    <div className="flex-1 min-w-0">
                        <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-sm text-white font-medium hover:text-amber-400 transition-colors truncate flex items-center gap-2"
                        >
                            {link.title || link.url}
                            <ExternalLink className="w-3 h-3 opacity-50" />
                        </a>
                        {link.title && (
                            <div className="text-xs text-gray-500 truncate mt-0.5">
                                {link.url}
                            </div>
                        )}
                        {link.addedAt && (
                            <div className="text-xs text-gray-600 mt-1">
                                Dodano {format(new Date(link.addedAt), "d MMM yyyy 'o' HH:mm", { locale: pl })}
                            </div>
                        )}
                    </div>

                    {/* Delete Button */}
                    {!readOnly && onDelete && (
                        <button
                            onClick={() => onDelete(link.id)}
                            className="p-1 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all"
                            title="Usuń link"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ))}
        </div>
    )
}
