import mongoose, { Schema } from 'mongoose';
import { encrypt } from '../utils/crypto.js';

const SystemApiKeySchema = new Schema(
  {
    description: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      required: true,
    },
    baseUrl: {
      type: String,
      required: true,
    },
    keyValue: {
      type: String,
      required: true,
    },
    managementUrl: {
      type: String,
      required: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
      },
    },
    toObject: {
      virtuals: true,
    }
  }
);

SystemApiKeySchema.virtual('isSystemApiKey').get(function () {
  return true;
});

SystemApiKeySchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('keyValue')) {
    try {
      this.keyValue = await encrypt(this.keyValue);
    } catch (error) {
      return next(error);
    }
  }
  next();
});


SystemApiKeySchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany', 'update'], async function (next) {
  const update = this.getUpdate();
  if (!update) return next();

  try {
    if (update.keyValue) {
      update.keyValue = await encrypt(update.keyValue);
      this.setUpdate(update);
    }
    else if (update.$set && update.$set.keyValue) {
      update.$set.keyValue = await encrypt(update.$set.keyValue);
      this.setUpdate(update);
    }
  } catch (error) {
    return next(error);
  }

  next();
});

export default mongoose.model('SystemApiKey', SystemApiKeySchema);