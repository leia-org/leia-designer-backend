import mongoose, { Schema } from 'mongoose';

const LeiaSchema = new Schema(
  {
    apiVersion: {
      type: String,
      required: true,
      default: 'v1',
      enum: ['v1'],
    },
    metadata: {
      name: {
        type: String,
        required: true,
      },
      version: {
        major: {
          type: Number,
          required: true,
          default: 1,
        },
        minor: {
          type: Number,
          required: true,
          default: 0,
        },
        patch: {
          type: Number,
          required: true,
          default: 0,
        },
      },
    },
    spec: {
      personaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Persona',
      },
      behaviourId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Behaviour',
      },
      problemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Problem',
      },
      persona: {
        type: Object,
      },
      behaviour: {
        type: Object,
      },
      problem: {
        type: Object,
      },
    },
  },
  {
    virtuals: {
      semanticVersion: {
        get: function () {
          return `${this.metadata.version.major}.${this.metadata.version.minor}.${this.metadata.version.patch}`;
        },
      },
    },
    strict: false,
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.metadata.version = ret.semanticVersion;
        delete ret.semanticVersion;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

LeiaSchema.index(
  { 'metadata.name': 1, 'metadata.version.major': 1, 'metadata.version.minor': 1, 'metadata.version.patch': 1 },
  { unique: true }
);

LeiaSchema.index({ 'metadata.name': 'text' });

export default mongoose.model('Leia', LeiaSchema);
