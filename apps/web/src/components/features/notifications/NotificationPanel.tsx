import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { X, CheckCircle2, BellOff, Clock, Bell } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from '@tanstack/react-router'
import { sidebarIcons } from '@/components/dashboard/icons/SidebarIcons'
import { useNotifications, NotificationItem } from '@/hooks/useNotifications'

export function NotificationPanel({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const { t, i18n } = useTranslation()
    const navigate = useNavigate()
    const { workspaceSlug } = useParams({ strict: false }) as { workspaceSlug?: string }
    const [mounted, setMounted] = useState(false)
    const [activeTab, setActiveTab] = useState<'All' | 'Tasks' | 'Messages' | 'Comments' | 'Assets' | 'Time'>('All')

    const {
        notifications,
        isLoading,
        markRead,
        markAllRead
    } = useNotifications()

    const currentLocale = i18n.language === 'pl' ? pl : enUS

    useEffect(() => {
        setMounted(true)
    }, [])

    const filteredNotifications = useMemo(() => {
        if (activeTab === 'All') return notifications
        const mapping: Record<string, string[]> = {
            'Tasks': ['task_created', 'task_assigned', 'task_status_changed', 'subtask_assigned'],
            'Messages': ['message_new', 'message_pinned', 'conversation_message'],
            'Comments': ['task_comment'],
            'Assets': ['file_uploaded'],
            'Time': ['time_entry_approved', 'time_entry_rejected']
        }
        const types = mapping[activeTab] || []
        return notifications.filter(n => types.includes(n.type))
    }, [notifications, activeTab])

    const groupedNotifications = useMemo(() => {
        const groups: { key: string, label: string, items: NotificationItem[] }[] = []
        const today = new Date().toDateString()
        const yesterday = new Date(Date.now() - 86400000).toDateString()

        const todayItems = filteredNotifications.filter(n => new Date(n.createdAt).toDateString() === today)
        const yesterdayItems = filteredNotifications.filter(n => new Date(n.createdAt).toDateString() === yesterday)
        const earlierItems = filteredNotifications.filter(n => {
            const date = new Date(n.createdAt).toDateString()
            return date !== today && date !== yesterday
        })

        if (todayItems.length > 0) groups.push({ key: 'today', label: t('notifications.groups.today'), items: todayItems })
        if (yesterdayItems.length > 0) groups.push({ key: 'yesterday', label: t('notifications.groups.yesterday'), items: yesterdayItems })
        if (earlierItems.length > 0) groups.push({ key: 'earlier', label: t('notifications.groups.earlier'), items: earlierItems })

        return groups
    }, [filteredNotifications, t])

    const translateTitle = (item: NotificationItem): string => {
        if (item.title.startsWith('notifications.')) {
            return t(item.title, (item.metadata as any) || {}) as string;
        }
        return item.title as string;
    };

    const translateMessage = (item: NotificationItem): string | null => {
        if (item.message && item.message.startsWith('notifications.')) {
            const interpolationData = {
                ...(item.metadata as any || {}),
                actor: item.actor?.name || t('common.someone')
            };

            // Handle new_message preview from metadata
            if (item.message === 'notifications.messages.new_message' && (item.metadata as any)?.preview) {
                (interpolationData as any).preview = (item.metadata as any).preview;
            }

            return t(item.message, interpolationData) as string;
        }

        if (item.message && typeof item.message === 'string') {
            if (item.message.includes('przypisał Cię do zadania:')) {
                const title = item.message.split('zadańia:')[1] || (item.metadata as any)?.title || '';
                return t('notifications.messages.task_assigned', { actor: item.actor?.name, title }) as string;
            }
            if (item.message.includes('skomentował zadanie:')) {
                const title = item.message.split('zadanie:')[1] || (item.metadata as any)?.title || '';
                return t('notifications.messages.new_comment', { actor: item.actor?.name, title }) as string;
            }
        }

        return item.message as string | null;
    };

    if (!mounted) return null

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className={clsx(
                    "fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Panel */}
            <div className={clsx(
                "fixed top-4 right-4 bottom-4 w-full max-w-[440px] bg-[var(--app-bg-card)] rounded-3xl z-[70] flex flex-col shadow-2xl transform transition-transform duration-300 ease-out border border-[var(--app-divider)] font-sans overflow-hidden",
                isOpen ? "translate-x-0" : "translate-x-[calc(100%+3rem)]"
            )}>
                {/* Header */}
                <div className="p-6 border-b border-[var(--app-divider)] flex items-center justify-between bg-[var(--app-bg-card)] relative z-10">
                    <div>
                        <h3 className="text-xl font-extrabold text-[var(--app-text-primary)] tracking-tight">{t('notifications.title')}</h3>
                        <p className="text-[13px] text-[var(--app-text-secondary)] mt-1 font-medium italic">
                            {t('notifications.unreadCount', { count: notifications.filter(n => !n.read).length })}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                markAllRead();
                            }}
                            title={t('notifications.markAllReadTitle')}
                            disabled={isLoading || notifications.length === 0}
                            className="p-2 bg-[var(--app-bg-elevated)] hover:bg-[var(--app-bg-sidebar)] border border-[var(--app-border)] rounded-xl text-[var(--app-text-muted)] hover:text-[var(--app-accent)] disabled:opacity-50 transition-all shadow-sm group"
                        >
                            <CheckCircle2 size={16} className="group-hover:scale-110 transition-transform" />
                        </button>
                        <button
                            onClick={onClose}
                            title={t('notifications.closePanel')}
                            className="p-2 bg-[var(--app-bg-elevated)] hover:bg-[var(--app-bg-sidebar)] border border-[var(--app-border)] rounded-xl text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] transition-all shadow-sm"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-6 border-b border-[var(--app-divider)] bg-[var(--app-bg-card)] flex gap-6 overflow-x-auto custom-scrollbar no-scrollbar">
                    {['All', 'Tasks', 'Messages', 'Comments', 'Assets', 'Time'].map((tab) => {
                        const label = t(`notifications.tabs.${tab.toLowerCase()}`);
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={clsx(
                                    "py-4 text-[13px] font-bold whitespace-nowrap transition-all relative flex items-center gap-2",
                                    activeTab === tab ? "text-[var(--app-accent)]" : "text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]"
                                )}
                            >
                                {label}
                                {activeTab === tab && (
                                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--app-accent)] rounded-t-full shadow-[0_-2px_10px_var(--app-accent)]" />
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Content List */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 custom-scrollbar bg-[var(--app-bg-sidebar)]/30">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-[var(--app-text-muted)]">
                            <div className="w-10 h-10 border-[3px] border-[var(--app-accent)] border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-sm font-bold tracking-tight">{t('notifications.loading')}</p>
                        </div>
                    ) : groupedNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-[var(--app-text-muted)] text-center px-8">
                            <div className="w-20 h-20 rounded-2xl bg-[var(--app-bg-elevated)] flex items-center justify-center border border-[var(--app-border)] mb-6 shadow-card rotate-3">
                                <BellOff size={32} className="text-[var(--app-text-muted)]/30 -rotate-3" />
                            </div>
                            <p className="font-extrabold text-[var(--app-text-primary)] text-lg tracking-tight">{t('notifications.noNotifications')}</p>
                            <p className="text-sm mt-2 leading-relaxed font-medium text-[var(--app-text-secondary)]">{t('notifications.noNotificationsDesc')}</p>
                        </div>
                    ) : (
                        groupedNotifications.map((group) => (
                            <div key={group.key} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-4 mb-4 px-2">
                                    <h4 className="text-[11px] font-black text-[var(--app-text-muted)] uppercase tracking-[0.2em]">{group.label}</h4>
                                    <div className="h-[1px] flex-1 bg-[var(--app-divider)]" />
                                </div>
                                <div className="space-y-3">
                                    {group.items.map((item) => (
                                        <div
                                            key={item.id}
                                            className={clsx(
                                                "flex gap-4 group relative cursor-pointer p-4 rounded-2xl transition-all border",
                                                !item.read
                                                    ? "bg-[var(--app-bg-card)] border-[var(--app-divider)] shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.18)]"
                                                    : "bg-transparent border-transparent hover:bg-[var(--app-bg-card)]/40 hover:border-[var(--app-divider)]"
                                            )}
                                            onClick={() => {
                                                markRead(item.id)
                                                if (item.link) {
                                                    const formattedLink = item.link.startsWith('/') ? item.link : `/${item.link}`;
                                                    const finalLink = workspaceSlug && !formattedLink.startsWith(`/${workspaceSlug}`)
                                                        ? `/${workspaceSlug}${formattedLink}`
                                                        : formattedLink;
                                                    navigate({ to: finalLink })
                                                }
                                                onClose()
                                            }}
                                        >
                                            {!item.read && (
                                                <div className="absolute top-5 right-5 w-2.5 h-2.5 rounded-full bg-[var(--app-accent)] shadow-[0_0_12px_var(--app-accent)] z-10 animate-pulse" />
                                            )}

                                            <div className="flex-shrink-0 mt-0.5">
                                                <NotificationIcon type={item.type} />
                                            </div>

                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="text-[14px] text-[var(--app-text-primary)] leading-tight">
                                                    {item.actor && <span className="font-black text-[var(--app-accent)] mr-1.5">{item.actor.name}</span>}
                                                    <span className={clsx("font-medium", !item.read && "font-bold")}>
                                                        {highlightKeywords(translateTitle(item))}
                                                    </span>
                                                </div>

                                                {item.message && (
                                                    <div className="mt-2.5 text-[12.5px] text-[var(--app-text-secondary)] line-clamp-2 border-l-2 border-[var(--app-accent)]/30 pl-3 py-0.5 font-medium leading-relaxed italic opacity-80 group-hover:opacity-100 transition-opacity">
                                                        {translateMessage(item)}
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-4 mt-3">
                                                    <span className="text-[11px] font-bold text-[var(--app-text-muted)] flex items-center gap-1.5">
                                                        <Clock size={12} className="opacity-50" />
                                                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: currentLocale })}
                                                    </span>
                                                    {item.metadata?.taskId && (
                                                        <span className="px-2 py-0.5 rounded-md bg-[var(--app-accent)]/10 border border-[var(--app-accent)]/20 text-[var(--app-accent)] text-[9px] uppercase font-black tracking-widest">
                                                            {t('notifications.types.task')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>,
        document.body
    )
}

function NotificationIcon({ type }: { type: string }) {
    const isTask = type.includes('task')
    const isComment = type.includes('comment')
    const isFile = type.includes('file') || type.includes('asset')
    const isTime = type.includes('time')
    const isMeeting = type.includes('meeting') || type.includes('event') || type.includes('reminder')
    const isMessage = type.includes('message') || type.includes('conversation')
    const isProject = type.includes('project')
    const isTeam = type.includes('team')

    let Icon: any = Bell
    let colorClass = "text-gray-400 bg-gray-500/10 border-gray-500/20"

    if (isTask) {
        Icon = sidebarIcons.dashboard
        colorClass = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
    } else if (isComment) {
        Icon = sidebarIcons.messages
        colorClass = "text-blue-500 bg-blue-500/10 border-blue-500/20"
    } else if (isMessage) {
        Icon = sidebarIcons.messages
        colorClass = "text-blue-400 bg-blue-400/10 border-blue-400/20"
    } else if (isFile) {
        Icon = sidebarIcons.files
        colorClass = "text-purple-500 bg-purple-500/10 border-purple-500/20"
    } else if (isTime) {
        Icon = sidebarIcons.timetracker
        colorClass = "text-amber-500 bg-amber-500/10 border-amber-500/20"
    } else if (isMeeting) {
        Icon = sidebarIcons.calendar
        colorClass = "text-rose-500 bg-rose-500/10 border-rose-500/20"
    } else if (isProject) {
        Icon = sidebarIcons.product
        colorClass = "text-[var(--app-accent)] bg-[var(--app-accent)]/10 border-[var(--app-accent)]/20"
    } else if (isTeam) {
        Icon = sidebarIcons.team
        colorClass = "text-cyan-500 bg-cyan-500/10 border-cyan-500/20"
    }

    return (
        <div className={clsx("w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm transition-transform group-hover:scale-105", colorClass)}>
            {typeof Icon === 'function' ? <Icon size={18} /> : Icon.gold}
        </div>
    )
}

function highlightKeywords(text: string) {
    if (!text) return null
    const parts = text.split(/([\[\(].*?[\]\)])/g)
    return parts.map((part, i) => {
        if ((part.startsWith('(') && part.endsWith(')')) || (part.startsWith('[') && part.endsWith(']'))) {
            return <span key={i} className="font-extrabold text-[var(--app-accent)] bg-[var(--app-accent)]/5 px-1 rounded mx-0.5">{part}</span>
        }
        return part
    })
}
