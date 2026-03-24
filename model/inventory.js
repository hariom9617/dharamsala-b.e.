// model/inventory.js
import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  minStock: {
    type: Number,
    required: true,
    min: 0
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  supplier: {
    type: String,
    trim: true
  },
  lastRestocked: {
    type: Date
  },
  notes: String
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    }
  }
});

// Indexes for better query performance
inventorySchema.index({ hotelId: 1, category: 1 });
inventorySchema.index({ hotelId: 1, name: 1 }, { collation: { locale: 'en', strength: 2 } });

const Inventory = mongoose.model('Inventory', inventorySchema);
export default Inventory;