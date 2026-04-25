import mongoose, { Schema } from 'mongoose';

const LabelSchema = new Schema({
  name: { type: String, required: true },  
  color: { type: String, required: true },  // "#b9482f"
  secundaryColor: { type: String, required: true },  // "#f9c8b0"
  user: { type: Schema.Types.ObjectId, ref: 'User' }, // quien la creó
  isGlobal: { type: Boolean, default: false }, // label del sistema o personal
});

export default mongoose.model('Label', LabelSchema);