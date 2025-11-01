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
      audioMode: {
        type: String,
        enum: ['realtime', null],
        default: null,
      },
      realtimeConfig: {
        model: {
          type: String,
          default: 'gpt-4o-realtime-preview',
        },
        voice: {
          type: String,
          enum: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer', 'marin'],
          default: 'marin',
        },
        instructions: {
          type: String,
          default: '',
        },
        turnDetection: {
          type: {
            type: String,
            enum: ['server_vad', 'none'],
            default: 'server_vad',
          },
          threshold: {
            type: Number,
            default: 0.5,
            min: 0,
            max: 1,
          },
          prefix_padding_ms: {
            type: Number,
            default: 300,
          },
          silence_duration_ms: {
            type: Number,
            default: 500,
          },
        },
      },
      data: {
        type: Schema.Types.Mixed,
      },
    },
  },
  {
    strict: false,
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
