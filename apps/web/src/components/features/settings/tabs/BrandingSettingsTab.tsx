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
      body: JSON.stringify({ logo: logoUrl }),
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
    },
  })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validation
    if (!file.type.startsWith('image/')) {
      setUploadError('Proszę wybrać plik graficzny (PNG, JPG, SVG).')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      // 2MB
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
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName)

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
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
            {uploadError}
          </div>
        )}

        <div className="flex flex-col items-center gap-8 rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg-card)] p-6 sm:flex-row">
          {/* Logo Preview */}
          <div className="group relative">
            <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg-elevated)] transition-all group-hover:border-[var(--app-border-hover)]">
              {workspace.logo ? (
                <img
                  src={workspace.logo}
                  alt="Workspace Logo"
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-4xl font-bold text-[var(--app-text-muted)] transition-colors group-hover:text-[var(--app-text-secondary)]">
                  {(workspace.name || 'W').charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Overlay for upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 text-sm font-medium text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
            >
              {isUploading ? 'Wysyłanie...' : 'Zmień logo'}
            </button>
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <h4 className="text-lg font-semibold text-[var(--app-text-primary)]">
                Logo organizacji
              </h4>
              <p className="mt-1 text-sm text-[var(--app-text-secondary)]">
                To logo będzie wyświetlane w pasku bocznym i na wszystkich stronach związanych z
                Twoją organizacją.
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
                className="rounded-lg bg-[var(--app-accent)] px-4 py-2 text-sm font-medium text-[var(--app-accent-text)] transition-colors hover:bg-[var(--app-accent-hover)] disabled:opacity-50"
              >
                {isUploading ? t('common.uploading') : t('common.upload_new_photo')}
              </button>
              {workspace.logo && (
                <button
                  onClick={() => saveLogo('')}
                  className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--app-text-primary)] transition-colors hover:bg-[var(--app-bg-card)]"
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Dark Preview */}
          <div className="rounded-2xl border border-gray-800 bg-[#0f0f14] p-6">
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500">
              Tryb ciemny
            </p>
            <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-[#1a1a24] p-3">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-gray-800">
                {workspace.logo && (
                  <img src={workspace.logo} className="h-full w-full object-contain" />
                )}
              </div>
              <span className="font-semibold text-gray-200">{workspace.name}</span>
            </div>
          </div>

          {/* Light Preview */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
              Tryb jasny
            </p>
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-gray-100">
                {workspace.logo && (
                  <img src={workspace.logo} className="h-full w-full object-contain" />
                )}
              </div>
              <span className="font-semibold text-gray-900">{workspace.name}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
