export interface StoredFile {
  provider: string;
  storageKey: string;
  url: string;
  mimeType?: string;
  uploadedAt: Date;
}

export interface StorageService {
  upload(buffer: Buffer, options: { folder: string; mimeType?: string }): Promise<StoredFile>;
  delete(storageKey: string): Promise<void>;
  getUrl(storageKey: string): string;
}
