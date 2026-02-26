import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, CopyObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// These envs will be available in the Cloudflare Worker context
// For local dev, they should be in .dev.vars or system env
// When using R2 binding in Worker, we usually use the binding directly
// but for presigned URLs we often need the S3 client approach

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID?.trim()
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID?.trim()
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY?.trim()
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME?.trim() || 'zadano-files'

// Validate R2 configuration
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.warn('⚠️ Cloudflare R2 environment variables are missing!', {
        accountId: !!R2_ACCOUNT_ID,
        accessKey: !!R2_ACCESS_KEY_ID,
        secretKey: !!R2_SECRET_ACCESS_KEY
    })
}

// Initialize S3 Client for R2
export const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID || '',
        secretAccessKey: R2_SECRET_ACCESS_KEY || '',
    },
    forcePathStyle: true, // Revert to path-style (ACCOUNT_ID.r2.cloudflarestorage.com/BUCKET)
})

export const getUploadUrl = async (key: string, contentType: string) => {
    console.log(`📡 Generating presigned URL for bucket: ${R2_BUCKET_NAME}, key: ${key}, type: ${contentType}`)
    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    })
    const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 })
    return url
}

export const getDownloadUrl = async (key: string, filename?: string) => {
    const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        ...(filename && { ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"` })
    })
    return await getSignedUrl(r2Client, command, { expiresIn: 3600 })
}

export const deleteFile = async (key: string) => {
    const command = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
    })
    return await r2Client.send(command)
}

export const checkFileExists = async (key: string) => {
    try {
        const command = new HeadObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
        })
        await r2Client.send(command)
        return true
    } catch (error: any) {
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
            return false
        }
        throw error
    }
}

export const copyFile = async (sourceKey: string, destinationKey: string) => {
    const command = new CopyObjectCommand({
        Bucket: R2_BUCKET_NAME,
        CopySource: `${R2_BUCKET_NAME}/${sourceKey}`,
        Key: destinationKey,
    })
    return await r2Client.send(command)
}

// Generate a presigned URL for inline viewing (no download prompt)
export const getPreviewUrl = async (key: string) => {
    const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        ResponseContentDisposition: 'inline',
    })
    return await getSignedUrl(r2Client, command, { expiresIn: 3600 })
}

// Fetch raw file content as text (for .txt editing)
export const getFileContent = async (key: string): Promise<string> => {
    const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
    })
    const response = await r2Client.send(command)
    if (!response.Body) throw new Error('Empty file body')
    return await response.Body.transformToString('utf-8')
}

// Overwrite file content directly in R2
export const putFileContent = async (key: string, content: string, mimeType: string) => {
    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: content,
        ContentType: mimeType,
    })
    return await r2Client.send(command)
}
