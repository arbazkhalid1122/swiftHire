import { v2 as cloudinary } from 'cloudinary';

const cloudName = process.env.CLOUD_NAME;
const apiKey = process.env.API_KEY;
const apiSecret = process.env.API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

/**
 * Upload a buffer to Cloudinary and return the public URL.
 * Uses CLOUD_NAME, API_KEY, API_SECRET from env.
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  publicId: string,
  resourceType: 'image' | 'video' | 'auto',
  contentType?: string
): Promise<string | null> {
  if (!cloudName || !apiKey || !apiSecret) {
    console.warn('Cloudinary not configured: set CLOUD_NAME, API_KEY, API_SECRET');
    return null;
  }

  const mime = contentType || (resourceType === 'video' ? 'video/webm' : 'image/jpeg');
  const b64 = buffer.toString('base64');
  const dataUri = `data:${mime};base64,${b64}`;

  try {
    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      public_id: publicId.replace(/\.[^.]+$/, ''),
      resource_type: resourceType,
      overwrite: true,
    });
    return result.secure_url ?? result.url ?? null;
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    throw err;
  }
}

export function isCloudinaryConfigured(): boolean {
  return !!(cloudName && apiKey && apiSecret);
}
