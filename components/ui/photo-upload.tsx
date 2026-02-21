'use client'

import * as React from 'react'
import { Camera, Upload, X, Loader2, ImageIcon, AlertCircle } from 'lucide-react'

import { useQueryClient } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { readExifMetadata } from '@/lib/photo-upload/exif'
import type { PhotoInsert } from '@/types/database'

interface PhotoUploadProps {
  projectId: string
  entityType: 'target-note' | 'observation' | 'habitat' | 'survey'
  entityId?: string
  photos: string[]
  onPhotosChange: (photos: string[]) => void
  maxPhotos?: number
  disabled?: boolean
  className?: string
  /** Current user ID — when provided, photo records are saved to the photos table */
  userId?: string
  /** Default tags applied to uploaded photos */
  defaultTags?: string[]
}

interface UploadingPhoto {
  id: string
  file: File
  preview: string
  progress: number
  error?: string
}

export function PhotoUpload({
  projectId,
  entityType,
  entityId,
  photos,
  onPhotosChange,
  maxPhotos = 10,
  disabled = false,
  className,
  userId,
  defaultTags,
}: PhotoUploadProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState<UploadingPhoto[]>([])
  const [_isCapturing, setIsCapturing] = React.useState(false)
  const [authUserId, setAuthUserId] = React.useState<string | null>(null)

  const supabase = createClient()

  // Auto-detect auth user for DB record creation
  React.useEffect(() => {
    if (userId) {
      setAuthUserId(userId)
      return
    }
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setAuthUserId(data.user.id)
    })
  }, [userId, supabase.auth])

  const canAddMore = photos.length + uploading.length < maxPhotos

  // Generate storage path for a photo
  const generatePath = (fileName: string) => {
    const timestamp = Date.now()
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    return `${projectId}/${entityType}/${entityId || 'draft'}/${timestamp}-${sanitizedName}`
  }

  // Upload a single photo and optionally create a DB record with EXIF data
  const uploadPhoto = async (file: File): Promise<string | null> => {
    const path = generatePath(file.name)

    const { data, error } = await supabase.storage.from('project-photos').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

    if (error) {
      console.error('Upload error:', error)
      throw error
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('project-photos').getPublicUrl(data.path)

    // Fire-and-forget: read EXIF and create DB record
    if (authUserId) {
      readExifMetadata(file)
        .then((exif) => {
          const locationValue =
            exif.latitude != null && exif.longitude != null
              ? `POINT(${exif.longitude} ${exif.latitude})`
              : undefined

          const record: PhotoInsert = {
            storage_path: data.path,
            project_id: projectId,
            created_by: authUserId,
            taken_at: exif.takenAt ?? undefined,
            location: locationValue,
            tags: defaultTags ?? [],
            caption: file.name,
            observation_id:
              entityType === 'observation' && entityId && entityId !== 'draft' ? entityId : null,
            survey_id:
              entityType === 'survey' && entityId && entityId !== 'draft' ? entityId : null,
            habitat_polygon_id:
              entityType === 'habitat' && entityId && entityId !== 'draft' ? entityId : null,
            target_note_id:
              entityType === 'target-note' && entityId && entityId !== 'draft' ? entityId : null,
          }

          return supabase
            .from('photos')
            .insert(record)
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ['photos', projectId] })
            })
        })
        .catch(() => {
          // Non-critical — photo is already uploaded to storage
        })
    }

    return urlData.publicUrl
  }

  // Handle file selection
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const validFiles: File[] = []
    const maxSize = 10 * 1024 * 1024 // 10MB

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // Check file type
      if (!file.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: `${file.name} is not an image file.`,
        })
        continue
      }

      // Check file size
      if (file.size > maxSize) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: `${file.name} exceeds 10MB limit.`,
        })
        continue
      }

      // Check max photos
      if (photos.length + validFiles.length >= maxPhotos) {
        toast({
          variant: 'destructive',
          title: 'Maximum photos reached',
          description: `You can only upload ${maxPhotos} photos.`,
        })
        break
      }

      validFiles.push(file)
    }

    if (validFiles.length === 0) return

    // Create upload placeholders
    const newUploading: UploadingPhoto[] = validFiles.map((file) => ({
      id: `${Date.now()}-${file.name}`,
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
    }))

    setUploading((prev) => [...prev, ...newUploading])

    // Upload all files
    const uploadedUrls: string[] = []

    for (const upload of newUploading) {
      try {
        // Update progress to indeterminate
        setUploading((prev) => prev.map((u) => (u.id === upload.id ? { ...u, progress: 50 } : u)))

        const url = await uploadPhoto(upload.file)

        if (url) {
          uploadedUrls.push(url)
        }

        // Remove from uploading
        setUploading((prev) => prev.filter((u) => u.id !== upload.id))

        // Revoke object URL
        URL.revokeObjectURL(upload.preview)
      } catch (error) {
        console.error('Upload failed:', error)
        setUploading((prev) =>
          prev.map((u) => (u.id === upload.id ? { ...u, error: 'Upload failed', progress: 0 } : u))
        )
      }
    }

    // Update photos
    if (uploadedUrls.length > 0) {
      onPhotosChange([...photos, ...uploadedUrls])
      toast({
        title: 'Photos uploaded',
        description: `${uploadedUrls.length} photo(s) uploaded successfully.`,
      })
    }
  }

  // Handle camera capture
  const handleCameraCapture = () => {
    if (!fileInputRef.current) return
    fileInputRef.current.setAttribute('capture', 'environment')
    fileInputRef.current.click()
    setIsCapturing(true)
  }

  // Handle file picker
  const handleFilePicker = () => {
    if (!fileInputRef.current) return
    fileInputRef.current.removeAttribute('capture')
    fileInputRef.current.click()
    setIsCapturing(false)
  }

  // Handle file input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (disabled || !canAddMore) return

    handleFileSelect(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  // Remove a photo
  const handleRemovePhoto = async (url: string) => {
    // Extract path from URL
    const path = url.split('/project-photos/').pop()

    if (path) {
      // Delete from storage
      const { error } = await supabase.storage
        .from('project-photos')
        .remove([decodeURIComponent(path)])

      if (error) {
        console.error('Delete error:', error)
        toast({
          variant: 'destructive',
          title: 'Delete failed',
          description: 'Could not delete the photo.',
        })
        return
      }
    }

    onPhotosChange(photos.filter((p) => p !== url))
    toast({
      title: 'Photo removed',
      description: 'Photo has been deleted.',
    })
  }

  // Remove uploading photo
  const handleCancelUpload = (id: string) => {
    const upload = uploading.find((u) => u.id === id)
    if (upload) {
      URL.revokeObjectURL(upload.preview)
    }
    setUploading((prev) => prev.filter((u) => u.id !== id))
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <div
        className={cn(
          'relative rounded-lg border-2 border-dashed p-4 transition-colors',
          disabled || !canAddMore
            ? 'cursor-not-allowed border-gray-200 bg-gray-50'
            : 'hover:border-primary hover:bg-muted/30 cursor-pointer border-gray-300'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={disabled || !canAddMore ? undefined : handleFilePicker}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled || !canAddMore}
        />

        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2">
            <div className="bg-muted rounded-full p-2">
              <Upload className="text-muted-foreground h-5 w-5" />
            </div>
            <div className="bg-muted rounded-full p-2">
              <Camera className="text-muted-foreground h-5 w-5" />
            </div>
          </div>
          <div className="text-sm">
            <span className="text-primary font-medium">Click to upload</span>
            <span className="text-muted-foreground"> or drag and drop</span>
          </div>
          <p className="text-muted-foreground text-xs">JPEG, PNG, WebP or HEIC (max 10MB each)</p>
          <p className="text-muted-foreground text-xs">
            {photos.length} / {maxPhotos} photos
          </p>
        </div>
      </div>

      {/* Camera Button (Mobile) */}
      <div className="flex gap-2 sm:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleCameraCapture}
          disabled={disabled || !canAddMore}
        >
          <Camera className="mr-2 h-4 w-4" />
          Take Photo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleFilePicker}
          disabled={disabled || !canAddMore}
        >
          <ImageIcon className="mr-2 h-4 w-4" />
          Choose File
        </Button>
      </div>

      {/* Photo Grid */}
      {(photos.length > 0 || uploading.length > 0) && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {/* Existing Photos */}
          {photos.map((url, index) => (
            <div key={url} className="group space-y-1">
              <div className="bg-muted relative aspect-square overflow-hidden rounded-lg border">
                <img src={url} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
                {!disabled && (
                  <button
                    type="button"
                    className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/80"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemovePhoto(url)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <p className="text-muted-foreground truncate text-[10px]">Photo {index + 1}</p>
            </div>
          ))}

          {/* Uploading Photos */}
          {uploading.map((upload) => (
            <div key={upload.id} className="space-y-1">
              <div className="bg-muted relative aspect-square overflow-hidden rounded-lg border">
                <img
                  src={upload.preview}
                  alt="Uploading"
                  className="h-full w-full object-cover opacity-50"
                />
                {upload.error ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                    <AlertCircle className="h-6 w-6 text-red-500" />
                    <span className="mt-1 text-xs text-white">Failed</span>
                    <button
                      type="button"
                      className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                      onClick={() => handleCancelUpload(upload.id)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
              </div>
              <p className="text-muted-foreground truncate text-[10px]">{upload.file.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
