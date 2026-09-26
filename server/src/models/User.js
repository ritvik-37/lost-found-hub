import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { ROLES } from '../constants.js';

const BCRYPT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'user' },
    phone: { type: String, trim: true, maxlength: 20, default: '' },
  },
  { timestamps: true },
);

userSchema.statics.hashPassword = (plain) => bcrypt.hash(plain, BCRYPT_ROUNDS);

userSchema.methods.checkPassword = function checkPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

/** The only shape a user ever leaves the API in (never includes the hash). */
userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone || '',
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);
