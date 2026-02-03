import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetchJson } from '@/lib/api'
import { useSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

interface BrandingSettingsTabProps {
    workspace: any
}

export function BrandingSettingsTab({ workspace }: BrandingSettingsTabProps) {
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
                <h3 className="text-lg font-semibold text-white">Branding</h3>

                {uploadError && (
                    <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-sm">
                        {uploadError}
                    </div>
                )}

                <div className="bg-[#1a1a24] rounded-xl p-6 flex items-center gap-6">
                    {/* Logo Preview */}
                    <div className="relative group">
                        {workspace.logo ? (
                            <img
                                src={workspace.logo}
                                alt="Workspace Logo"
                                className="w-24 h-24 rounded-xl object-cover bg-black"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white">
                                {workspace.name?.substring(0, 2).toUpperCase() || 'WT'}
                            </div>
                        )}
                        {isUploading && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1">
                        <h4 className="text-white font-medium mb-1">Logo Organizacji</h4>
                        <p className="text-sm text-gray-500 mb-4">Zalecany format: 512x512px, PNG lub SVG. Max 2MB.</p>

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
                            {isUploading ? 'Przesyłanie...' : 'Zmień logo'}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    )
}
