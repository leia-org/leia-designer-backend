import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  leiaId: { type: Schema.Types.ObjectId, required: true },
  userId: { type: Schema.Types.ObjectId, required: true },
  role: { type: String, required: true },
  apiKeyId: { type: String, required: true, select: false },
  target: { type: String, required: true },
  active: { type: Boolean, default: true },
  status: { type: String, enum: ['queued', 'running', 'completed', 'partial', 'failed', 'interrupted'], default: 'queued' },
  steps: [{
    _id: false,
    target: String,
    entityId: String,
    status: { type: String, default: 'queued' },
    image: String,
    error: String,
  }],
  lease: String,
  leaseUntil: Date,
  error: String,
}, { timestamps: true });

// The database, rather than a mounted React component, rejects duplicate work.
schema.index({ leiaId: 1 }, { unique: true, partialFilterExpression: { active: true } });
schema.index({ userId: 1, leiaId: 1, createdAt: -1 });
export default mongoose.model('ImageRegeneration', schema);
