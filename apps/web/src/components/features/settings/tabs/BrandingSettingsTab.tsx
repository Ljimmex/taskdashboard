import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetchJson } from '@/lib/api'
import { useSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

interface BrandingSettingsTabProps {
    workspace: any
}

export function BrandingSettingsTab({ workspace }: BrandingSettingsTabProps) {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const queryClient = useQueryClient()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [isUploading, setIsUploading] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)

    const updateWorkspaceLogo = async (logoUrl: string) => {
        if (!workspace?.id) return
        return apiFetchJson(`/api/workspaces/${workspace.id}`, {
            method: 'PATCH',
            headers: { 'x-user-id': session?.user?.id || '' },
            body: JSON.stringify({ logo: logoUrl })
        })
    }

    const { mutate: saveLogo } = useMutation({
        mutationFn: updateWorkspaceLogo,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspace', workspace.slug] })
            setIsUploading(false)
        },
        onError: (err) => {
            console.error(err)
            setUploadError('Nie udało się zapisać logo w bazie.')
            setIsUploading(false)
        }
    })

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validation
        if (!file.type.startsWith('image/')) {
            setUploadError('Proszę wybrać plik graficzny (PNG, JPG, SVG).')
            return
        }
        if (file.size > 2 * 1024 * 1024) { // 2MB
            setUploadError('Maksymalny rozmiar pliku to 2MB.')
            return
        }

        setUploadError(null)
        setIsUploading(true)

        try {
            const fileName = `workspace-logos/${workspace.id}/${Date.now()}-${file.name}`

            // Upload to Supabase 'avatars' bucket (as agreed in plan)
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
            saveLogo(publicUrl)

        } catch (error) {
            console.error('Upload error:', error)
            setUploadError('Wystąpił błąd podczas przesyłania pliku.')
            setIsUploading(false)
        }
    }

    return (
        <div className="space-y-8">
            {/* Section: Branding */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-[var(--app-text-primary)]">Branding</h3>

                {uploadError && (
                    <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-sm border border-red-500/20">
                        {uploadError}
                    </div>
                )}

                <div className="bg-[var(--app-bg-card)] border border-[var(--app-border)] rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-8">
                    {/* Logo Preview */}
                    <div className="relative group">
                        <div className="w-40 h-40 bg-[var(--app-bg-elevated)] border border-[var(--app-border)] rounded-2xl overflow-hidden flex items-center justify-center transition-all group-hover:border-[var(--app-border-hover)]">
                            {workspace.logo ? (
                                <img
                                    src={workspace.logo}
                                    alt="Workspace Logo"
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <span className="text-4xl font-bold text-[var(--app-text-muted)] group-hover:text-[var(--app-text-secondary)] transition-colors">
                                    {(workspace.name || 'W').charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>

                        {/* Overlay for upload */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-medium rounded-2xl backdrop-blur-sm"
                        >
                            {isUploading ? 'Wysyłanie...' : 'Zmień logo'}
                        </button>
                    </div>

                    <div className="flex-1 space-y-4">
                        <div>
                            <h4 className="font-semibold text-[var(--app-text-primary)] text-lg">Logo organizacji</h4>
                            <p className="text-sm text-[var(--app-text-secondary)] mt-1">
                                To logo będzie wyświetlane w pasku bocznym i na wszystkich stronach związanych z Twoją organizacją.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="px-4 py-2 bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-[var(--app-accent-text)] text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isUploading ? t('common.uploading') : t('common.upload_new_photo')}
                            </button>
                            {workspace.logo && (
                                <button
                                    onClick={() => saveLogo('')}
                                    className="px-4 py-2 bg-[var(--app-bg-elevated)] border border-[var(--app-border)] text-[var(--app-text-primary)] hover:bg-[var(--app-bg-card)] text-sm font-medium rounded-lg transition-colors"
                                >
                                    Usuń
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-[var(--app-text-muted)]">
                            Zalecany format: PNG, JPG lub SVG. Maksymalny rozmiar: 2MB.
                        </p>
                    </div>
                </div>
            </section>

            {/* Preview Section */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-[var(--app-text-primary)]">Podgląd</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Dark Preview */}
                    <div className="bg-[#0f0f14] border border-gray-800 rounded-2xl p-6">
                        <p className="text-xs text-gray-500 mb-4 uppercase tracking-wider font-bold">Tryb ciemny</p>
                        <div className="flex items-center gap-3 bg-[#1a1a24] p-3 rounded-lg border border-gray-800">
                            <div className="w-8 h-8 rounded shrink-0 overflow-hidden bg-gray-800">
                                {workspace.logo && <img src={workspace.logo} className="w-full h-full object-contain" />}
                            </div>
                            <span className="font-semibold text-gray-200">{workspace.name}</span>
                        </div>
                    </div>

                    {/* Light Preview */}
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                        <p className="text-xs text-gray-400 mb-4 uppercase tracking-wider font-bold">Tryb jasny</p>
                        <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
                            <div className="w-8 h-8 rounded shrink-0 overflow-hidden bg-gray-100">
                                {workspace.logo && <img src={workspace.logo} className="w-full h-full object-contain" />}
                            </div>
                            <span className="font-semibold text-gray-900">{workspace.name}</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
