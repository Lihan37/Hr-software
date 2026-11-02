import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { app } from '../src/app.js';
import { issueAccessToken } from '../src/modules/auth/auth.service.js';
import { Employee } from '../src/modules/employees/employee.model.js';
import { AuditLog } from '../src/modules/audit/audit.model.js';
import { storageService } from '../src/modules/storage/cloudinary.provider.js';
import { employeePhotoMaxBytes, isEmployeePhoto } from '../src/modules/employees/employee-photo.policy.js';

const id = '507f191e810c19729de860ea';
const webp = Buffer.from('RIFFxxxxWEBP');
const stored = { provider: 'cloudinary', storageKey: 'new-photo', url: 'https://example.test/new-photo.webp', uploadedAt: new Date() };
const send = (role: 'HR' | 'HR_ADMIN' | 'SUPER_ADMIN' | 'MANAGER' | 'EMPLOYEE' = 'HR') => request(app).post(`/api/v1/employees/${id}/photo`).set('Authorization', `Bearer ${issueAccessToken(id, role)}`);
function mocks() {
  const employee = { _id: id, employeeId: 'EMP-000001', profilePhoto: { storageKey: 'old-photo', url: 'https://example.test/old-photo.png' }, save: vi.fn().mockResolvedValue(undefined) };
  vi.spyOn(Employee, 'findById').mockResolvedValue(employee as never);
  const upload = vi.spyOn(storageService, 'upload').mockResolvedValue(stored);
  const remove = vi.spyOn(storageService, 'delete').mockResolvedValue(undefined);
  const audit = vi.spyOn(AuditLog, 'create').mockResolvedValue({} as never);
  return { employee, upload, remove, audit };
}
afterEach(() => vi.restoreAllMocks());
describe('employee profile photo upload', () => {
  it('accepts only WebP signatures and rejects JPEG, PNG and SVG', () => {
    expect(isEmployeePhoto(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), 'image/png')).toBe(false);
    expect(isEmployeePhoto(Buffer.from([255, 216, 255, 224]), 'image/jpeg')).toBe(false);
    expect(isEmployeePhoto(webp, 'image/webp')).toBe(true);
    expect(isEmployeePhoto(Buffer.from('not webp'), 'image/webp')).toBe(false);
    expect(isEmployeePhoto(Buffer.from('<svg/>'), 'image/svg+xml')).toBe(false);
  });
  it('requires authentication and rejects non-HR roles before storage', async () => {
    const { upload } = mocks();
    expect((await request(app).post(`/api/v1/employees/${id}/photo`)).status).toBe(401);
    for (const role of ['EMPLOYEE', 'MANAGER'] as const) expect((await send(role).attach('photo', webp, { filename: 'portrait.webp', contentType: 'image/webp' })).status).toBe(403);
    expect(upload).not.toHaveBeenCalled();
  });
  it.each(['HR', 'HR_ADMIN', 'SUPER_ADMIN'] as const)('lets %s save to the same Employee Master and audit the change', async (role) => {
    const { employee, upload, remove, audit } = mocks();
    const result = await send(role).attach('photo', webp, { filename: 'portrait.webp', contentType: 'image/webp' });
    expect(result.status).toBe(200); expect(result.body.data.url).toBe(stored.url);
    expect(upload).toHaveBeenCalledWith(webp, { folder: 'hrms/employees/EMP-000001', mimeType: 'image/webp' });
    expect(employee.save).toHaveBeenCalled(); expect(employee.profilePhoto).toEqual(stored);
    expect(remove).toHaveBeenCalledWith('old-photo');
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'EMPLOYEE_PHOTO_UPDATED', entityId: id }));
  });
  it('returns readable errors for missing, unsupported, disguised and oversized files', async () => {
    const { upload } = mocks();
    expect((await send()).status).toBe(422);
    expect((await send().attach('photo', Buffer.from('text'), { filename: 'text.txt', contentType: 'text/plain' })).status).toBe(415);
    expect((await send().attach('photo', Buffer.from('text'), { filename: 'fake.webp', contentType: 'image/webp' })).status).toBe(422);
    for (const type of ['image/png', 'image/jpeg']) expect((await send().attach('photo', webp, { filename: 'photo', contentType: type })).status).toBe(415);
    expect((await send().attach('photo', Buffer.alloc(employeePhotoMaxBytes + 1), { filename: 'large.webp', contentType: 'image/webp' })).status).toBe(413);
    expect(upload).not.toHaveBeenCalled();
  });
  it('preserves the old photo if media storage fails', async () => {
    const { upload, employee, remove } = mocks();
    upload.mockRejectedValueOnce(new Error('Storage unavailable'));
    expect((await send().attach('photo', webp, { filename: 'portrait.webp', contentType: 'image/webp' })).status).toBe(502);
    expect(employee.profilePhoto.storageKey).toBe('old-photo'); expect(employee.save).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled();
  });
  it('does not upload for nonexistent employees', async () => {
    const { upload } = mocks(); vi.mocked(Employee.findById).mockResolvedValueOnce(null);
    expect((await send().attach('photo', webp, { filename: 'portrait.webp', contentType: 'image/webp' })).status).toBe(404);
    expect(upload).not.toHaveBeenCalled();
  });
  it('accepts a photo at the exact 1000 KB boundary', async () => {
    mocks();
    const atLimit = Buffer.alloc(employeePhotoMaxBytes); webp.copy(atLimit);
    expect((await send().attach('photo', atLimit, { filename: 'boundary.webp', contentType: 'image/webp' })).status).toBe(200);
  });
});
