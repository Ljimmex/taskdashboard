import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetchJson } from '@/lib/api'
import { useSession } from '@/lib/auth'
import { Label } from '@/components/ui/label'

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
    const queryClient = useQueryClient()
    const { data: session } = useSession()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)

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
            alert('Profile updated successfully')
        },
        onError: () => alert('Failed to update profile')
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
            alert('Failed to upload avatar')
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
                <h3 className="text-lg font-medium text-white">Account Settings</h3>
                <p className="text-sm text-gray-400">Manage your profile and account preferences.</p>
            </div>

            {/* Profile Picture */}
            <div>
                <Label className="text-gray-400 text-xs mb-2 block">Photo</Label>
                <div className="flex items-center gap-4">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-black overflow-hidden shadow-lg border-2 border-[#1a1a24] cursor-pointer hover:opacity-80 transition-opacity ${user?.image ? 'bg-transparent' : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}
                    >
                        {user?.image ? (
                            <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            user?.name?.charAt(0) || user?.email?.charAt(0) || '?'
                        )}
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    <div>
                        <div className="flex gap-2 text-sm">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="text-gray-300 hover:text-white font-medium text-xs"
                            >
                                {isUploading ? 'Uploading...' : 'Change photo'}
                            </button>
                            <span className="text-gray-600">·</span>
                            <button
                                onClick={() => {
                                    if (confirm('Are you sure you want to remove your profile picture?')) {
                                        deleteAvatarMutation.mutate()
                                    }
                                }}
                                className="text-gray-500 hover:text-white font-medium text-xs"
                            >
                                Remove photo
                            </button>
                        </div>
                        <p className="text-gray-500 text-[10px] mt-1">Pick a photo up to 4MB.</p>
                    </div>
                </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={form.handleSubmit((data: AccountFormValues) => updateProfileMutation.mutate(data))} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* First Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">First Name</label>
                        <input
                            {...form.register('firstName')}
                            className="w-full px-4 py-2.5 bg-[#0a0a0f] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-[#F2CE88] transition-colors"
                            placeholder="John"
                        />
                        {form.formState.errors.firstName && (
                            <p className="text-xs text-red-500">{form.formState.errors.firstName.message}</p>
                        )}
                    </div>

                    {/* Last Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Last Name</label>
                        <input
                            {...form.register('lastName')}
                            className="w-full px-4 py-2.5 bg-[#0a0a0f] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-[#F2CE88] transition-colors"
                            placeholder="Doe"
                        />
                        {form.formState.errors.lastName && (
                            <p className="text-xs text-red-500">{form.formState.errors.lastName.message}</p>
                        )}
                    </div>

                    {/* Position */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Position</label>
                        <input
                            {...form.register('position')}
                            className="w-full px-4 py-2.5 bg-[#0a0a0f] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-[#F2CE88] transition-colors"
                            placeholder="e.g. Product Designer"
                        />
                    </div>

                    {/* Gender */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Gender</label>
                        <select
                            {...form.register('gender')}
                            className="w-full px-4 py-2.5 bg-[#0a0a0f] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-[#F2CE88] transition-colors appearance-none"
                        >
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                            <option value="prefer_not_to_say">Prefer not to say</option>
                        </select>
                    </div>

                    {/* Date of Birth */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Date of Birth</label>
                        <div className="relative">
                            <input
                                type="date"
                                {...form.register('birthDate')}
                                className="w-full px-4 py-2.5 bg-[#0a0a0f] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-[#F2CE88] transition-colors [color-scheme:dark]"
                            />
                            {/* <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} /> */}
                        </div>
                    </div>

                    {/* Timezone */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Timezone</label>
                        <input // Or select with list of timezones
                            {...form.register('timezone')}
                            className="w-full px-4 py-2.5 bg-[#0a0a0f] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-[#F2CE88] transition-colors"
                            placeholder="e.g. Europe/Warsaw"
                        />
                    </div>

                    {/* Country */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Country</label>
                        <input
                            {...form.register('country')}
                            className="w-full px-4 py-2.5 bg-[#0a0a0f] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-[#F2CE88] transition-colors"
                            placeholder="e.g. Poland"
                        />
                    </div>

                    {/* City */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">City</label>
                        <input
                            {...form.register('city')}
                            className="w-full px-4 py-2.5 bg-[#0a0a0f] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-[#F2CE88] transition-colors"
                            placeholder="e.g. Warsaw"
                        />
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Description</label>
                    <textarea
                        {...form.register('description')}
                        rows={4}
                        className="w-full px-4 py-2.5 bg-[#0a0a0f] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-[#F2CE88] transition-colors resize-none"
                        placeholder="Tell us a bit about yourself..."
                    />
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="px-6 py-2.5 bg-[#F2CE88] hover:bg-[#ffe0a3] text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>

            {/* Danger Zone */}
            <div className="pt-8 border-t border-gray-800">
                <button
                    type="button"
                    onClick={() => {
                        if (confirm('Are you absolutely sure you want to delete your account? This action cannot be undone.')) {
                            deleteAccountMutation.mutate()
                        }
                    }}
                    className="text-red-500 hover:text-red-400 text-sm font-medium transition-colors"
                >
                    Delete my account
                </button>
            </div>
        </div>
    )
}
