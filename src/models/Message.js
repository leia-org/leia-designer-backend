import { Schema, model } from 'mongoose';

const messageSchema = new Schema({
  text: {
    type: String,
    required: true,
  },
  isLeia: {
    type: Boolean,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  session: {
    type: Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
  },
});

export default model('Message', messageSchema);
