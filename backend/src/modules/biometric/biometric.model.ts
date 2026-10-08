import { Schema, model } from 'mongoose';

const deviceSchema = new Schema({
  deviceId: { type: String, required: true, unique: true }, name: { type: String, required: true },
  provider: { type: String, enum: ['ZKTECO'], default: 'ZKTECO' },
  serialNumber: String, model: String, location: String, ipAddress: { type: String, select: false },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'ERROR'], default: 'ACTIVE' },
  lastSyncAt: Date, metadata: Schema.Types.Mixed
}, { timestamps: true });
export const BiometricDevice = model('BiometricDevice', deviceSchema);

const mappingSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  provider: { type: String, enum: ['ZKTECO'], default: 'ZKTECO' },
  deviceUserId: { type: String, required: true }, device: { type: Schema.Types.ObjectId, ref: 'BiometricDevice', required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });
mappingSchema.index({ device: 1, deviceUserId: 1 }, { unique: true });
export const EmployeeBiometricMapping = model('EmployeeBiometricMapping', mappingSchema);

const punchSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', default: null, index: true },
  deviceUserId: { type: String, required: true }, device: { type: Schema.Types.ObjectId, ref: 'BiometricDevice', required: true, index: true },
  punchTimestamp: { type: Date, required: true, index: true }, punchType: String,
  providerPunchId: String, source: { type: String, enum: ['ZKTECO', 'SIMULATOR'], required: true },
  rawPayload: { type: Schema.Types.Mixed, immutable: true }, importedAt: { type: Date, default: Date.now },
  processingStatus: { type: String, enum: ['PENDING', 'PROCESSED', 'UNRESOLVED', 'ERROR'], default: 'PENDING', index: true },
  idempotencyKey: { type: String, required: true, unique: true, immutable: true }
}, { timestamps: true });

punchSchema.pre(['deleteOne', 'findOneAndDelete'], function () {
  throw new Error('Biometric punches are immutable');
});
export const BiometricPunch = model('BiometricPunch', punchSchema);
