import mongoose, { Schema } from 'mongoose';

const RubricSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    markdown: {
      type: String,
      required: true,
      maxlength: 50000,
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
