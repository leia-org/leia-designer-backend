import mongoose, { Schema } from 'mongoose';

const RubricSchema = new Schema(
  {
    apiVersion: {
      type: String,
      required: true,
      enum: ['v1'],
    },
    metadata: {
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
      },
    },
    spec: {
      evaluationPrompt: {
        type: String,
      },
      sections: [{
        _id: false,
        title: { type: String, required: true },
        weight: { type: Number, required: true, min: 0, max: 100 },
        levels: [{ type: String, required: true }],
        criteria: [{
          _id: false,
          name: { type: String, required: true },
          descriptors: [{
            _id: false,
            level: { type: String, required: true },
            description: { type: String, required: true },
          }],
        }],
      }],
    },
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      alias: 'userId',
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        if (ret._id && !ret.id) {
          ret.id = ret._id.toString();
        }
        delete ret.__v;
        delete ret.userId;
      },
    },
  },
);

RubricSchema.index({ user: 1, updatedAt: -1 });
RubricSchema.index({ user: 1, isPublished: 1 });
RubricSchema.index({ 'metadata.name': 'text' });

export default mongoose.model('Rubric', RubricSchema);
