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
    orchestration: {
      mode: {
        type: String,
        enum: ['single', 'multi'],
        default: 'single',
      },
      maxInternalTurns: {
        type: Number,
        min: 2,
        max: 5,
        default: 2,
      },
      openingLeiaId: {
        type: Schema.Types.ObjectId,
        default: null,
      },
      problemLeiaId: {
        type: Schema.Types.ObjectId,
        default: null,
      },
      sharedTask: {
        type: String,
        default: '',
      },
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    user: {
      type: Schema.Types.ObjectId,
      alias: 'userId'
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
