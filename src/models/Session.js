import { Schema, model } from 'mongoose';

const sessionSchema = new Schema({
  startedAt: {
    type: Date,
    default: Date.now,
  },
  finishedAt: {
    type: Date,
  },
  result: {
    type: String,
  },
  evaluation: {
    type: String,
  },
  messages: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
  ],
  experiment: {
    type: Schema.Types.ObjectId,
    ref: 'Experiment',
    required: true,
  },
  assignedLeia: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isTest: {
    type: Boolean,
    default: false,
  },
});

export default model('Session', sessionSchema);
