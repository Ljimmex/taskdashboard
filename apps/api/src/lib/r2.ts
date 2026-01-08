import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// These envs will be available in the Cloudflare Worker context
// For local dev, they should be in .dev.vars or system env
// When using R2 binding in Worker, we usually use the binding directly
// but for presigned URLs we often need the S3 client approach

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'zadano-files'

// Initialize S3 Client for R2
export const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID || '',
        secretAccessKey: R2_SECRET_ACCESS_KEY || '',
    },
})

export const getUploadUrl = async (key: string, contentType: string) => {
    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    })
    return await getSignedUrl(r2Client, command, { expiresIn: 3600 })
}

export const getDownloadUrl = async (key: string) => {
    const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
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
