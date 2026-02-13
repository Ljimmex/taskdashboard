import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiFetchJson } from '@/lib/api'
import { useSession } from '@/lib/auth'
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// Icons
// import { Trash2, Upload } from 'lucide-react' 

// Schema
const accountSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    description: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    birthDate: z.string().optional(), // ISO string YYYY-MM-DD
    position: z.string().optional(),
    gender: z.string().optional(),
    timezone: z.string().optional(),
})

type AccountFormValues = z.infer<typeof accountSchema>

export function AccountSettingsTab() {
    const { t } = useTranslation()
    const queryClient = useQueryClient()
    const { data: session } = useSession()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)

    // Get list of all timezones
    const supportedTimezones = (Intl as any).supportedValuesOf ? (Intl as any).supportedValuesOf('timeZone') : ['Europe/Warsaw', 'UTC']

    // Fetch full user profile
    const { data: user, isLoading } = useQuery({
        queryKey: ['user', 'me'],
        queryFn: async () => {
            return apiFetchJson<any>('/api/users/me')
        },
        enabled: !!session?.user?.id
    })

    const form = useForm<AccountFormValues>({
        resolver: zodResolver(accountSchema),
        values: {
            firstName: user?.firstName || user?.name?.split(' ')[0] || '',
            lastName: user?.lastName || user?.name?.split(' ').slice(1).join(' ') || '',
            description: user?.description || '',
            country: user?.country || '',
            city: user?.city || '',
            birthDate: user?.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : '',
            position: user?.position || '',
            gender: user?.gender || '',
            timezone: user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        }
    })

    // Mutations
    const updateProfileMutation = useMutation({
        mutationFn: async (data: AccountFormValues) => {
            // Update name (full name) as well
            const payload = {
                ...data,
                name: `${data.firstName} ${data.lastName}`.trim(),
                birthDate: data.birthDate || null, // Handle empty string
            }
            return apiFetchJson('/api/users/me', {
                method: 'PATCH',
                body: JSON.stringify(payload)
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user', 'me'] })
            // Ideally invalidate session too
            alert(t('settings.account.toast.success'))
        },
        onError: () => alert(t('settings.account.toast.error'))
    })

    const uploadAvatarMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData()
            formData.append('file', file)
            return apiFetchJson('/api/users/me/avatar', {
                method: 'POST',
                body: formData
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user', 'me'] })
            setIsUploading(false)
        },
        onError: () => {
            setIsUploading(false)
            alert(t('settings.account.toast.avatarError'))
        }
    })

    const deleteAvatarMutation = useMutation({
        mutationFn: async () => {
            return apiFetchJson('/api/users/me/avatar', {
                method: 'DELETE'
            })
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user', 'me'] })
    })

    const deleteAccountMutation = useMutation({
        mutationFn: async () => {
            return apiFetchJson('/api/users/me', {
                method: 'DELETE'
            })
        },
        onSuccess: () => {
            window.location.href = '/' // Redirect to home/login
        }
    })

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setIsUploading(true)
            uploadAvatarMutation.mutate(file)
        }
    }

    if (isLoading) return <div className="text-gray-400">Loading profile...</div>

    return (
        <div className="space-y-8 max-w-3xl">
            {/* Header */}
            <div>
                <h3 className="text-lg font-medium text-white">{t('settings.account.title')}</h3>
                <p className="text-sm text-gray-400">{t('settings.account.subtitle')}</p>
            </div>

            {/* Photo Section */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-white">{t('settings.account.photo.title')}</h3>
                <div className="bg-[#1a1a24] rounded-xl p-6 flex items-center gap-6">
                    <div className="relative group">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`w-20 h-20 rounded-xl flex items-center justify-center text-2xl font-bold text-black overflow-hidden shadow-lg border-2 border-[#1a1a24] cursor-pointer hover:opacity-80 transition-opacity ${user?.image ? 'bg-transparent' : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}
                        >
                            {user?.image ? (
                                <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                user?.name?.charAt(0) || user?.email?.charAt(0) || '?'
                            )}
                        </div>
                        {isUploading && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                            >
                                {isUploading ? t('settings.account.photo.uploading') : t('settings.account.photo.change')}
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm(t('settings.account.photo.confirmRemove'))) {
                                        deleteAvatarMutation.mutate()
                                    }
                                }}
                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm transition-colors"
                            >
                                {t('settings.account.photo.remove')}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{t('settings.account.photo.hint')}</p>
                    </div>
                </div>
            </section>

            {/* Profile Form */}
            <form onSubmit={form.handleSubmit((data: AccountFormValues) => updateProfileMutation.mutate(data))} className="space-y-8">
                {/* Personal Information */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">{t('settings.account.personalInfo.title')}</h3>
                        <button
                            type="submit"
                            disabled={updateProfileMutation.isPending}
                            className={`px-4 py-2 font-medium rounded-lg text-sm transition-colors ${updateProfileMutation.isPending
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                : 'bg-[#F2CE88] hover:bg-[#d9b877] text-black'
                                }`}
                        >
                            {updateProfileMutation.isPending ? t('settings.account.personalInfo.saving') : t('settings.account.personalInfo.save')}
                        </button>
                    </div>

                    <div className="bg-[#1a1a24] rounded-xl p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* First Name */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">{t('settings.account.personalInfo.firstName')}</label>
                                <input
                                    {...form.register('firstName')}
                                    className="w-full bg-[#12121a] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none focus:border-[#F2CE88]"
                                    placeholder={t('settings.account.personalInfo.firstNamePlaceholder')}
                                />
                                {form.formState.errors.firstName && (
                                    <p className="text-xs text-red-500">{form.formState.errors.firstName.message}</p>
                                )}
                            </div>

                            {/* Last Name */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">{t('settings.account.personalInfo.lastName')}</label>
                                <input
                                    {...form.register('lastName')}
                                    className="w-full bg-[#12121a] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none focus:border-[#F2CE88]"
                                    placeholder={t('settings.account.personalInfo.lastNamePlaceholder')}
                                />
                                {form.formState.errors.lastName && (
                                    <p className="text-xs text-red-500">{form.formState.errors.lastName.message}</p>
                                )}
                            </div>

                            {/* Date of Birth */}
                            <div className="space-y-2 flex flex-col">
                                <label className="text-sm font-medium text-gray-400">{t('settings.account.personalInfo.birthDate')}</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            className={cn(
                                                "w-full bg-[#12121a] border border-gray-800 rounded-lg px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 outline-none focus:border-[#F2CE88]",
                                                !form.watch('birthDate') ? "text-gray-500" : "text-white"
                                            )}
                                        >
                                            <CalendarIcon className="w-4 h-4 text-gray-400" />
                                            {form.watch('birthDate') ? (
                                                format(new Date(form.watch('birthDate')!), "PPP")
                                            ) : (
                                                <span>{t('settings.account.personalInfo.pickDate')}</span>
                                            )}
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-[#12121a] border-gray-800 text-white" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={form.watch('birthDate') ? new Date(form.watch('birthDate')!) : undefined}
                                            onSelect={(date) => {
                                                if (date) { /**/
                                                    const offset = date.getTimezoneOffset()
                                                    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000))
                                                    form.setValue('birthDate', adjustedDate.toISOString().split('T')[0], { shouldDirty: true })
                                                } else {
                                                    form.setValue('birthDate', undefined, { shouldDirty: true })
                                                }
                                            }}
                                            disabled={(date) =>
                                                date > new Date() || date < new Date("1900-01-01")
                                            }
                                            initialFocus
                                            className="bg-[#12121a]"
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Gender */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">{t('settings.account.personalInfo.gender')}</label>
                                <select
                                    {...form.register('gender')}
                                    className="w-full bg-[#12121a] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none focus:border-[#F2CE88] appearance-none"
                                >
                                    <option value="">{t('settings.account.personalInfo.selectGender')}</option>
                                    <option value="male">{t('settings.account.personalInfo.genders.male')}</option>
                                    <option value="female">{t('settings.account.personalInfo.genders.female')}</option>
                                    <option value="other">{t('settings.account.personalInfo.genders.other')}</option>
                                    <option value="prefer_not_to_say">{t('settings.account.personalInfo.genders.prefer_not_to_say')}</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Professional Details */}
                <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">{t('settings.account.professional.title')}</h3>
                    <div className="bg-[#1a1a24] rounded-xl p-6 space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">{t('settings.account.professional.position')}</label>
                            <input
                                {...form.register('position')}
                                className="w-full bg-[#12121a] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none focus:border-[#F2CE88]"
                                placeholder={t('settings.account.professional.positionPlaceholder')}
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">{t('settings.account.professional.description')}</label>
                            <textarea
                                {...form.register('description')}
                                rows={4}
                                className="w-full bg-[#12121a] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none focus:border-[#F2CE88] min-h-[100px]"
                                placeholder={t('settings.account.professional.descriptionPlaceholder')}
                            />
                        </div>
                    </div>
                </section>

                {/* Location & Preferences */}
                <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">{t('settings.account.location.title')}</h3>
                    <div className="bg-[#1a1a24] rounded-xl p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Country */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">{t('settings.account.location.country')}</label>
                                <input
                                    {...form.register('country')}
                                    className="w-full bg-[#12121a] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none focus:border-[#F2CE88]"
                                    placeholder={t('settings.account.location.countryPlaceholder')}
                                />
                            </div>

                            {/* City */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">{t('settings.account.location.city')}</label>
                                <input
                                    {...form.register('city')}
                                    className="w-full bg-[#12121a] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none focus:border-[#F2CE88]"
                                    placeholder={t('settings.account.location.cityPlaceholder')}
                                />
                            </div>

                            {/* Timezone */}
                            <div className="space-y-2 col-span-1 md:col-span-2">
                                <label className="text-sm font-medium text-gray-400">{t('settings.account.location.timezone')}</label>
                                <select
                                    {...form.register('timezone')}
                                    className="w-full bg-[#12121a] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none focus:border-[#F2CE88] appearance-none"
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
                            </div>
                        </div>
                    </div>
                </section>
            </form>

            {/* Danger Zone */}
            <div className="pt-8 border-t border-gray-800">
                <button
                    type="button"
                    onClick={() => {
                        if (confirm(t('settings.account.danger.confirmDelete'))) {
                            deleteAccountMutation.mutate()
                        }
                    }}
                    className="text-red-500 hover:text-red-400 text-sm font-medium transition-colors"
                >
                    {t('settings.account.danger.deleteAccount')}
                </button>
            </div>
        </div>
    )
}
