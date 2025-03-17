import mongoose, { Schema } from 'mongoose';
import { generateUniqueCode } from '../utils/entity.js';
import LeiaConfigSchema from './LeiaConfig.js';

const ExperimentSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: false,
    },
    duration: {
      type: Number,
      required: true,
      default: 1800,
    },
    leias: [LeiaConfigSchema],
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

ExperimentSchema.pre('validate', async function (next) {
  try {
    if (!this.experimentCode) {
      this.experimentCode = await generateUniqueCode(ExperimentModel, 'X', 5);
    }

    next();
  } catch (err) {
    next(err);
  }
});

ExperimentSchema.methods.regenerateCode = async function () {
  this.code = await generateUniqueCode(ExperimentModel, 'X', 5);
};

const ExperimentModel = mongoose.model('Experiment', ExperimentSchema);

export default ExperimentModel;
