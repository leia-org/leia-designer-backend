import { Schema } from 'mongoose';

const LeiaConfigSchema = new Schema(
  {
    leia: {
      type: Schema.Types.ObjectId,
      ref: 'Leia',
      required: true,
    },
    configuration: {
      mode: {
        type: String,
        required: true,
        enum: ['standard', 'transcription'],
        default: 'standard',
      },
      data: {
        type: Schema.Types.Mixed,
      },
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

export default LeiaConfigSchema;
