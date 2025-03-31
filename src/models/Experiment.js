import mongoose, { Schema } from 'mongoose';
import LeiaConfigSchema from './LeiaConfig.js';

const ExperimentSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    leias: [LeiaConfigSchema],
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    strict: false,
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

export default mongoose.model('Experiment', ExperimentSchema);
