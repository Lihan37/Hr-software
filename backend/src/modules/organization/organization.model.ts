import { Schema, model } from 'mongoose';

function namedEntitySchema(extra: Record<string, unknown> = {}) {
  const schema = new Schema({
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, trim: true },
    active: { type: Boolean, default: true, index: true },
    ...extra
  }, { timestamps: true });
  schema.index({ code: 1 }, { unique: true });
  schema.index({ name: 1 }, { unique: true });
  return schema;
}

export const Department = model('Department', namedEntitySchema());
export const Section = model('Section', namedEntitySchema({ department: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true } }));
export const Designation = model('Designation', namedEntitySchema({ rank: { type: Number, default: 0 } }));
