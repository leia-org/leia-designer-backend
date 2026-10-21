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
