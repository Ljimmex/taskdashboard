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
  const [timezone, setTimezone] = useState(
    workspace?.settings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
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
    // The instruction's provided snippet for updateWorkspaceMock was syntactically incorrect.
    // Assuming the intent was to keep the original PATCH call for workspace updates,
    // and the `members` line was an accidental inclusion or part of a different change.
    // Reverting to the original correct structure for updating the workspace.
    return apiFetchJson(`/api/workspaces/${workspace.id}`, {
      method: 'PATCH',
      headers: { 'x-user-id': session?.user?.id || '' },
      body: JSON.stringify(data),
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
    },
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
    },
  })

  const handleSave = () => {
    setIsSaving(true)
    saveSettings({
      name,
      slug,
      description,
      settings: { timezone },
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
    if (file.size > 2 * 1024 * 1024) {
      // 2MB
      setUploadError(t('settings.organization.general.logo_size_error'))
      return
    }

    setUploadError(null)
    setIsUploading(true)

    try {
      const fileName = `workspace - logos / ${workspace.id}/${Date.now()}-${file.name}`

      // Upload to Supabase 'avatars' bucket
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
      saveLogo({ logo: publicUrl })
    } catch (error) {
      console.error('Upload error:', error)
      setUploadError(t('settings.organization.general.upload_error'))
      setIsUploading(false)
    }
  }

  // Get list of all timezones
  const supportedTimezones = (Intl as any).supportedValuesOf
    ? (Intl as any).supportedValuesOf('timeZone')
    : ['Europe/Warsaw', 'UTC']

  return (
    <div className="space-y-8">
      {/* Messages */}
      {message && (
        <div
          className={`rounded-lg p-4 text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}
        >
          {message.text}
        </div>
      )}

      {/* Logo Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-[var(--app-text-primary)]">
          {t('settings.organization.general.logo_title')}
        </h3>

        {uploadError && (
          <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{uploadError}</div>
        )}

        <div className="flex items-center gap-6 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-elevated)] p-6">
          <div className="group relative">
            {workspace.logo ? (
              <img
                src={workspace.logo}
                alt="Workspace Logo"
                className="h-20 w-20 rounded-xl bg-black object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white">
                {workspace.name?.substring(0, 2).toUpperCase() || 'WT'}
              </div>
            )}
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
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
              className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-card)] px-4 py-2 text-sm text-[var(--app-text-primary)] transition-colors hover:bg-[var(--app-bg-page)]"
            >
              {isUploading ? t('common.uploading') : t('settings.organization.general.change_logo')}
            </button>
            <p className="mt-2 text-xs text-[var(--app-text-muted)]">
              {t('settings.organization.general.logo_hint')}
            </p>
          </div>
        </div>
      </section>

      {/* Section: Organization Profile */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--app-text-primary)]">
            {t('settings.organization.general.profile_title')}
          </h3>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isSaving
                ? 'cursor-not-allowed bg-[var(--app-bg-elevated)] text-[var(--app-text-muted)]'
                : 'bg-[var(--app-accent)] text-[var(--app-accent-text)] hover:opacity-90'
            }`}
          >
            {isSaving ? t('common.saving') : t('common.save_changes')}
          </button>
        </div>

        <div className="space-y-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-elevated)] p-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]">
              {t('settings.organization.general.name_label')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-card)] px-4 py-2 text-[var(--app-text-primary)] outline-none focus:border-[var(--app-accent)]"
              placeholder={t('settings.organization.general.name_placeholder')}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]">
              {t('settings.organization.general.slug_label')}
            </label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-lg border border-r-0 border-[var(--app-border)] bg-[var(--app-bg-card)] px-3 text-sm text-[var(--app-text-muted)]">
                zadano.app/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="flex-1 rounded-r-lg border border-[var(--app-border)] bg-[var(--app-bg-card)] px-4 py-2 text-[var(--app-text-primary)] outline-none focus:border-[var(--app-accent)]"
                placeholder="slug"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]">
              {t('settings.organization.general.description_label')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-card)] px-4 py-2 text-[var(--app-text-primary)] outline-none focus:border-[var(--app-accent)]"
              placeholder={t('settings.organization.general.description_placeholder')}
            />
          </div>
        </div>
      </section>

      {/* Section: Timezone */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-[var(--app-text-primary)]">
          {t('settings.organization.general.location_title')}
        </h3>
        <div className="space-y-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-elevated)] p-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]">
              {t('settings.organization.general.timezone_label')}
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-card)] px-4 py-2 text-[var(--app-text-primary)] outline-none focus:border-[var(--app-accent)]"
            >
              {supportedTimezones.map((tz: string) => {
                const offset =
                  new Intl.DateTimeFormat('en-US', {
                    timeZone: tz,
                    timeZoneName: 'longOffset',
                  })
                    .format(new Date())
                    .split(', ')[1] || 'UTC'

                return (
                  <option key={tz} value={tz}>
                    {tz} ({offset})
                  </option>
                )
              })}
            </select>
            <p className="mt-2 text-xs text-[var(--app-text-muted)]">
              {t('settings.organization.general.timezone_hint', {
                tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
              })}
            </p>
          </div>
        </div>
      </section>

      {/* Section: Danger Zone */}
      <section className="border-t border-[var(--app-border)] pt-8">
        <button
          type="button"
          className="text-sm font-medium text-red-500 transition-colors hover:text-red-400"
          onClick={() => alert(t('common.feature_coming_soon'))}
        >
          {t('settings.organization.general.delete_workspace')}
        </button>
      </section>
    </div>
  )
}
