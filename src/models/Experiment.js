import mongoose, { Schema } from 'mongoose';
import LeiaConfigSchema from './LeiaConfig.js';

const StageSchema = new Schema(
  {
    id: { type: String, required: true },
    previousStageId: { type: String, default: null },
    orchestration: {
      mode: { type: String, enum: ['single', 'multi'], default: 'single' },
      maxInternalTurns: { type: Number, min: 1, max: 8, default: 2 },
      openingLeiaId: { type: String, default: null },
      problemLeiaId: { type: String, default: null },
      sharedTask: { type: String, default: '' },
    },
  },
  { _id: false, id: false },
);

const ExperimentSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    leias: [LeiaConfigSchema],
    stages: { type: [StageSchema], default: undefined },
    orchestration: {
      mode: {
        type: String,
        enum: ['single', 'multi'],
        default: 'single',
      },
      maxInternalTurns: {
        type: Number,
        min: 1,
        max: 8,
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
