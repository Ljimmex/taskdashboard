import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { apiFetchJson } from '@/lib/api'
import { useFiles } from '@/hooks/useFiles'
import { LastResources } from '@/components/dashboard/LastResources'
import { FileInfoPanel } from '@/components/features/files/FileInfoPanel'
import type { FileRecord } from '@taskdashboard/types'
import type { DashboardPanelProps } from '@/lib/dashboard'

export function LastResourcesPanel({ workspaceSlug }: DashboardPanelProps) {
  const navigate = useNavigate()
  const { data: files } = useFiles(workspaceSlug, null, true)
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null)
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false)

  const handleFileClick = (fileId: string) => {
    const file = files?.find((f) => f.id === fileId)
    if (file) {
      setSelectedFile(file)
      setIsInfoPanelOpen(true)
    }
  }

  const handleDownload = async (id: string) => {
    try {
      const json = await apiFetchJson<any>(`/api/files/${id}/download`)
      const { downloadUrl } = json
      window.open(downloadUrl, '_blank')
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  return (
    <>
      <LastResources
        files={files || []}
        onSeeAll={() => navigate({ to: `/${workspaceSlug}/files` })}
        onFileClick={handleFileClick}
      />
      <FileInfoPanel
        file={selectedFile}
        isOpen={isInfoPanelOpen}
        onClose={() => {
          setIsInfoPanelOpen(false)
          setSelectedFile(null)
        }}
        onDownload={handleDownload}
        onRename={(id) => console.log('Rename requested for', id)}
        onDelete={(id) => console.log('Delete requested for', id)}
      />
    </>
  )
}
