import mongoose, { Schema } from 'mongoose';

const LeiaDraftSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      default: 'Untitled LEIA',
    },
    state: {
      type: Schema.Types.Mixed,
      required: true,
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
      virtuals: true,
      transform: (_document, result) => {
        result.id = result._id.toString();
        delete result._id;
        delete result.__v;
      },
    },
  },
);

LeiaDraftSchema.index({ user: 1, updatedAt: -1 });

export default mongoose.model('LeiaDraft', LeiaDraftSchema);
