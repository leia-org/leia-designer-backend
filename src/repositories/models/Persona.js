import mongoose, { Schema } from 'mongoose';

const PersonaSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    version: {
      type: String,
      match: [/^\d+\.\d+\.\d+$/, 'Version must be in format x.x.x'],
      required: true,
      default: '1.0.0',
    },
    fullName: {
      type: String,
    },
    firstName: {
      type: String,
    },
    description: {
      type: String,
    },
    personality: {
      type: String,
    },
    subjectPronoum: {
      type: String,
    },
    objectPronoum: {
      type: String,
    },
    possesivePronoum: {
      type: String,
    },
    possesiveAdjective: {
      type: String,
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

PersonaSchema.index({ name: 1, version: 1 }, { unique: true });

export default mongoose.model('Persona', PersonaSchema);
