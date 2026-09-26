import mongoose from 'mongoose';
import { CLAIM_STATUSES } from '../constants.js';

const claimSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    claimant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, trim: true, maxlength: 200, default: '' },
    proofAnswer: { type: String, required: true, trim: true, minlength: 10, maxlength: 300 },
    status: { type: String, enum: CLAIM_STATUSES, default: 'PENDING' },
    adminRemarks: { type: String, trim: true, maxlength: 200, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);

// DB-level guard for "one pending claim per user per item" (the controller also checks APPROVED).
claimSchema.index({ item: 1, claimant: 1 }, { unique: true, partialFilterExpression: { status: 'PENDING' } });
claimSchema.index({ claimant: 1, createdAt: -1 });
claimSchema.index({ status: 1, createdAt: -1 });

export const Claim = mongoose.model('Claim', claimSchema);
