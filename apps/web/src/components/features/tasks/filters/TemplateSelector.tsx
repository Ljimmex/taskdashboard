import { useState, useRef, useEffect } from 'react'

interface TaskTemplateData {
    titlePrefix?: string
    description?: string
    type?: 'task' | 'meeting'
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    labels?: string[]
    estimatedHours?: number
    subtasks?: {
        title: string
        description?: string
        priority?: string
    }[]
}

interface TaskTemplate {
    id: string
    name: string
    description?: string
    templateData: TaskTemplateData
    creator: {
        id: string
        name: string
        image?: string
    }
}

interface TemplateSelectorProps {
    workspaceSlug: string
    userId?: string
    onApplyTemplate: (templateData: TaskTemplateData) => void
}

const TemplateIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
)

const ChevronDownIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="6 9 12 15 18 9" />
    </svg>
)

const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <polyline points="20 6 9 17 4 12" />
    </svg>
)

export function TemplateSelector({ workspaceSlug, userId, onApplyTemplate }: TemplateSelectorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [templates, setTemplates] = useState<TaskTemplate[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    // Fetch templates
    useEffect(() => {
        const fetchTemplates = async () => {
            if (!workspaceSlug || !userId) return
            setLoading(true)
            try {
                const res = await fetch(`/api/templates?workspaceSlug=${workspaceSlug}`, {
                    credentials: 'include',
                    headers: {
                        'x-user-id': userId,
                    }
                })
                const data = await res.json()
                if (data.success) {
                    setTemplates(data.data)
                }
            } catch (e) {
                console.error('Failed to fetch templates:', e)
            } finally {
                setLoading(false)
            }
        }
        if (userId) {
            fetchTemplates()
        }
    }, [workspaceSlug, userId])

    // Click outside handler
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelectTemplate = (template: TaskTemplate) => {
        setSelectedTemplate(template)
        onApplyTemplate(template.templateData)
        setIsOpen(false)
    }

    const handleClearTemplate = () => {
        setSelectedTemplate(null)
        setIsOpen(false)
    }

    // Don't render if no templates
    if (templates.length === 0 && !loading) {
        return null
    }

    return (
        <div className="relative" ref={menuRef}>
            {/* Template selector button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${selectedTemplate
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'bg-gray-800/50 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600'
                    }`}
            >
                <TemplateIcon />
                <span className="truncate max-w-[150px]">
                    {selectedTemplate ? selectedTemplate.name : 'Użyj szablonu'}
                </span>
                <ChevronDownIcon />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute left-0 top-11 z-50 w-64 bg-[#1a1a24] rounded-xl shadow-2xl border border-gray-800 overflow-hidden">
                    {/* Header */}
                    <div className="px-3 py-2 border-b border-gray-800">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Szablony zadań
                        </span>
                    </div>

                    {/* Templates list */}
                    <div className="max-h-60 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                                Ładowanie...
                            </div>
                        ) : (
                            <>
                                {/* Clear template option - only if one is selected */}
                                {selectedTemplate && (
                                    <button
                                        onClick={handleClearTemplate}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                                    >
                                        <span className="w-4 h-4" />
                                        <span className="italic">Wyczyść szablon</span>
                                    </button>
                                )}

                                {/* Template items */}
                                {templates.map(template => (
                                    <button
                                        key={template.id}
                                        onClick={() => handleSelectTemplate(template)}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                                    >
                                        <span className="w-4 h-4 flex items-center justify-center text-amber-400">
                                            {selectedTemplate?.id === template.id && <CheckIcon />}
                                        </span>
                                        <div className="flex-1 text-left min-w-0">
                                            <div className="truncate font-medium">{template.name}</div>
                                            {template.description && (
                                                <div className="text-xs text-gray-500 truncate">
                                                    {template.description}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
