import mongoose from 'mongoose';

/**
 * Uploaded photos live in MongoDB (max 5 MB each, well under the 16 MB document limit), so the app
 * works on hosts with a throwaway filesystem such as Render's free tier. Served at /uploads/:id.
 */
const uploadSchema = new mongoose.Schema(
  {
    data: { type: Buffer, required: true },
    contentType: { type: String, enum: ['image/jpeg', 'image/png', 'image/webp'], required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Upload = mongoose.model('Upload', uploadSchema);
