import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'instructor', 'advanced'],
    },
    useSystemApiKey: {
      type: Boolean,
      required: true,
      default: false
    },
    isSystemApiKeyDefault: {
      type: Boolean,
      required: true,
      default: false
    },
    defaultSystemApiKeyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SystemApiKey'
    },
    apiKeys: [
      {
        description: {
          type: String,
          required: true,
        },
        provider: { // provider que serua el enum que dijo rada
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
        isDefault: {
          type: Boolean,
          default: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        }
      },
    ]
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.password;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

UserSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

UserSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany', 'update'], async function (next) {
  const update = this.getUpdate();
  if (!update) return next();

  if (update.password) {
    update.password = await bcrypt.hash(update.password, 10);
    this.setUpdate(update);
  } else if (update.$set && update.$set.password) {
    update.$set.password = await bcrypt.hash(update.$set.password, 10);
    this.setUpdate(update);
  }
  next();
});

UserSchema.methods.isCorrectPassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model('User', UserSchema);
