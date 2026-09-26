import mongoose from 'mongoose';
import { CATEGORIES, ITEM_STATUSES, ITEM_TYPES, LOCATIONS } from '../constants.js';

const itemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ITEM_TYPES, required: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 60 },
    description: { type: String, required: true, trim: true, minlength: 15, maxlength: 500 },
    category: { type: String, enum: CATEGORIES, required: true },
    location: { type: String, enum: LOCATIONS, required: true },
    exactSpot: { type: String, trim: true, maxlength: 80, default: '' },
    /** Day the item was lost/found, stored at UTC midnight. */
    date: { type: Date, required: true },
    imageUrl: { type: String, default: '' },
    status: { type: String, enum: ITEM_STATUSES, default: 'PENDING' },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    /** Private identifying detail. Never selected unless explicitly asked for (admins / reporter). */
    hiddenDetails: { type: String, required: true, trim: true, minlength: 5, maxlength: 120, select: false },
    statusNote: { type: String, trim: true, maxlength: 200, default: '' },
    statusChangedAt: { type: Date },
  },
  { timestamps: true },
);

itemSchema.index({ status: 1, type: 1, date: -1 });
itemSchema.index({ reportedBy: 1, createdAt: -1 });
itemSchema.index({ createdAt: -1 });

export const Item = mongoose.model('Item', itemSchema);
