import { v2 as cloudinary } from 'cloudinary';
import { env } from '../../config/env.js';
import type { StorageService, StoredFile } from './storage.service.js';

cloudinary.config({ cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET });

export class CloudinaryStorageProvider implements StorageService {
  async upload(buffer: Buffer, options: { folder: string; mimeType?: string }): Promise<StoredFile> {
    if (!env.CLOUDINARY_CLOUD_NAME) throw new Error('Cloudinary is not configured');
    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder: options.folder, resource_type: 'auto' }, (error, upload) => error ? reject(error) : resolve(upload));
      stream.end(buffer);
    });
    return { provider: 'cloudinary', storageKey: result.public_id, url: result.secure_url, mimeType: options.mimeType, uploadedAt: new Date() };
  }
  async delete(storageKey: string) { await cloudinary.uploader.destroy(storageKey); }
  getUrl(storageKey: string) { return cloudinary.url(storageKey, { secure: true }); }
}

export const storageService: StorageService = new CloudinaryStorageProvider();
