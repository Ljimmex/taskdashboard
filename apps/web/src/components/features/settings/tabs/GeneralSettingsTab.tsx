import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetchJson } from '@/lib/api'
import { useSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

interface GeneralSettingsTabProps {
    workspace: any
}

export function GeneralSettingsTab({ workspace }: GeneralSettingsTabProps) {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const queryClient = useQueryClient()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [name, setName] = useState(workspace?.name || '')
    const [slug, setSlug] = useState(workspace?.slug || '')
    const [description, setDescription] = useState(workspace?.description || '')
    const [timezone, setTimezone] = useState(workspace?.settings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [uploadError, setUploadError] = useState<string | null>(null)

    // Sync state with props
    useEffect(() => {
        if (workspace) {
            setName(workspace.name || '')
            setSlug(workspace.slug || '')
            setDescription(workspace.description || '')
            setTimezone(workspace.settings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)
        }
    }, [workspace])

    // Update mutation
    const updateWorkspaceMock = async (data: any) => {
        if (!workspace?.id) return
        return apiFetchJson(`/api/workspaces/${workspace.id}`, {
            method: 'PATCH',
            headers: { 'x-user-id': session?.user?.id || '' },
            body: JSON.stringify(data)
        })
    }

    const { mutate: saveSettings } = useMutation({
        mutationFn: updateWorkspaceMock,
        onSuccess: (data: any) => {
            setMessage({ type: 'success', text: t('settings.organization.general.success') })
            queryClient.invalidateQueries({ queryKey: ['workspace', workspace.slug] })
            setIsSaving(false)

            // If slug changed, redirect
            if (data.data?.slug && data.data?.slug !== workspace.slug) {
                window.location.href = `/workspace/${data.data.slug}`
            }

            setTimeout(() => setMessage(null), 3000)
        },
        onError: (error) => {
            setMessage({ type: 'error', text: t('settings.organization.general.error') })
            setIsSaving(false)
            console.error(error)
        }
    })

    const { mutate: saveLogo } = useMutation({
        mutationFn: updateWorkspaceMock,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspace', workspace.slug] })
            setIsUploading(false)
        },
        onError: (err) => {
            console.error(err)
            setUploadError(t('settings.organization.general.logo_save_error'))
            setIsUploading(false)
        }
    })

    const handleSave = () => {
        setIsSaving(true)
        saveSettings({
            name,
            slug,
            description,
            settings: { timezone }
        })
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validation
        if (!file.type.startsWith('image/')) {
            setUploadError(t('settings.organization.general.logo_type_error'))
            return
        }
        if (file.size > 2 * 1024 * 1024) { // 2MB
            setUploadError(t('settings.organization.general.logo_size_error'))
            return
        }

        setUploadError(null)
        setIsUploading(true)

        try {
            const fileName = `workspace-logos/${workspace.id}/${Date.now()}-${file.name}`

            // Upload to Supabase 'avatars' bucket
            const { error: uploadErr } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true })

            if (uploadErr) {
                throw uploadErr
            }

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName)

            // Update Backend
            saveLogo({ logo: publicUrl })

        } catch (error) {
            console.error('Upload error:', error)
            setUploadError(t('settings.organization.general.upload_error'))
            setIsUploading(false)
        }
    }

    // Get list of all timezones
    const supportedTimezones = (Intl as any).supportedValuesOf ? (Intl as any).supportedValuesOf('timeZone') : ['Europe/Warsaw', 'UTC']

    return (
        <div className="space-y-8">
            {/* Messages */}
            {message && (
                <div className={`p-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {message.text}
                </div>
            )}

            {/* Logo Section */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-white">{t('settings.organization.general.logo_title')}</h3>

                {uploadError && (
                    <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-sm">
                        {uploadError}
                    </div>
                )}

                <div className="bg-[#1a1a24] rounded-xl p-6 flex items-center gap-6">
                    <div className="relative group">
                        {workspace.logo ? (
                            <img
                                src={workspace.logo}
                                alt="Workspace Logo"
                                className="w-20 h-20 rounded-xl object-cover bg-black"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
                                {workspace.name?.substring(0, 2).toUpperCase() || 'WT'}
                            </div>
                        )}
                        {isUploading && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1">
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                        >
                            {isUploading ? t('common.uploading') : t('settings.organization.general.change_logo')}
                        </button>
                        <p className="text-xs text-gray-500 mt-2">{t('settings.organization.general.logo_hint')}</p>
                    </div>
                </div>
            </section>

            {/* Section: Organization Profile */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">{t('settings.organization.general.profile_title')}</h3>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`px-4 py-2 font-medium rounded-lg text-sm transition-colors ${isSaving
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-[#F2CE88] hover:bg-[#d9b877] text-black'
                            }`}
                    >
                        {isSaving ? t('common.saving') : t('common.save_changes')}
                    </button>
                </div>

                <div className="bg-[#1a1a24] rounded-xl p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">{t('settings.organization.general.name_label')}</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-[#12121a] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none focus:border-[#F2CE88]"
                            placeholder={t('settings.organization.general.name_placeholder')}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">{t('settings.organization.general.slug_label')}</label>
                        <div className="flex">
                            <span className="inline-flex items-center px-3 rounded-l-lg bg-[#12121a] border border-r-0 border-gray-800 text-gray-500 text-sm">
                                zadano.app/
                            </span>
                            <input
                                type="text"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                className="flex-1 bg-[#12121a] border border-gray-800 rounded-r-lg px-4 py-2 text-white outline-none focus:border-[#F2CE88]"
                                placeholder="slug"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">{t('settings.organization.general.description_label')}</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-[#12121a] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none focus:border-[#F2CE88] min-h-[100px]"
                            placeholder={t('settings.organization.general.description_placeholder')}
                        />
                    </div>
                </div>
            </section>

            {/* Section: Timezone */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-white">{t('settings.organization.general.location_title')}</h3>
                <div className="bg-[#1a1a24] rounded-xl p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">{t('settings.organization.general.timezone_label')}</label>
                        <select
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            className="w-full bg-[#12121a] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none focus:border-[#F2CE88]"
                        >
                            {supportedTimezones.map((tz: string) => {
                                const offset = new Intl.DateTimeFormat('en-US', {
                                    timeZone: tz,
                                    timeZoneName: 'longOffset'
                                }).format(new Date()).split(', ')[1] || 'UTC'

                                return (
                                    <option key={tz} value={tz}>
                                        {tz} ({offset})
                                    </option>
                                )
                            })}
                        </select>
                        <p className="text-xs text-gray-500 mt-2">
                            {t('settings.organization.general.timezone_hint', { tz: Intl.DateTimeFormat().resolvedOptions().timeZone })}
                        </p>
                    </div>
                </div>
            </section>

            {/* Section: Danger Zone */}
            <section className="pt-8 border-t border-gray-800">
                <button
                    type="button"
                    className="text-red-500 hover:text-red-400 text-sm font-medium transition-colors"
                    onClick={() => alert(t('common.feature_coming_soon'))}
                >
                    {t('settings.organization.general.delete_workspace')}
                </button>
            </section>
        </div>
    )
}
