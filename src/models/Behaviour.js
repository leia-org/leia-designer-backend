import mongoose, { Schema } from 'mongoose';

const BehaviourSchema = new Schema(
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
      description: {
        type: String,
      },
      role: {
        type: String,
      },
      process: {
        type: [String],
        default: [],
        enum: ['requirements-elicitation', 'game'],
      },
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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

BehaviourSchema.index(
  { 'metadata.name': 1, 'metadata.version.major': 1, 'metadata.version.minor': 1, 'metadata.version.patch': 1 },
  { unique: true }
);

BehaviourSchema.index({ 'metadata.name': 'text' });

// Auto-populate user field in find queries
BehaviourSchema.pre(['find', 'findOne', 'findOneAndUpdate'], function () {
  this.populate('user');
});

export default mongoose.model('Behaviour', BehaviourSchema);
