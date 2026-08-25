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
      markdown: {
        type: String,
        required: true,
        maxlength: 50000,
      },
    },
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      alias: 'userId',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.__v;
        delete ret.user;
        delete ret.userId;
      },
    },
  },
);

RubricSchema.index({ user: 1, updatedAt: -1 });

export default mongoose.model('Rubric', RubricSchema);
