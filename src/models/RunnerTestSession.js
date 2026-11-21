import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  _id: String,
  user: { type: String, required: true },
  leia: Schema.Types.Mixed,
  runnerConfiguration: Schema.Types.Mixed,
  messages: { type: [Schema.Types.Mixed], default: [] },
  openingCompleted: { type: Boolean, default: false },
  openingClaimedAt: Date,
  stoppingSatisfied: { type: Boolean, default: false },
  lastObservedMessageId: String,
}, { timestamps: true });

export default mongoose.model('RunnerTestSession', schema);
