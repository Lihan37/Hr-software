export const employeePhotoMimeTypes = ['image/webp'];
export const employeePhotoMaxBytes = 1000 * 1000;
export function isEmployeePhoto(buffer: Buffer, mimeType: string) {
  if (mimeType === 'image/webp') return buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  return false;
}
