// Keep in sync with server/src/constants.js (the server validates everything again).
import { Backpack, BookOpen, IdCard, KeyRound, Package, Shirt, Smartphone, Wallet } from 'lucide-react';

export const CATEGORIES = ['Electronics', 'ID Cards', 'Books', 'Bags', 'Keys', 'Clothing', 'Wallets', 'Other'];

export const LOCATIONS = [
  'Main Library',
  'Tech Park',
  'University Building',
  'Java Canteen',
  'Hostel Block A',
  'Hostel Block B',
  'Sports Complex',
  'Bio-Tech Block',
  'Auditorium',
  'Parking Lot',
];

export const PUBLIC_STATUSES = ['VERIFIED', 'CLAIMED', 'CLOSED'];

/** Timeline shown in My Activity. REJECTED is shown separately. */
export const STATUS_STEPS = ['PENDING', 'VERIFIED', 'CLAIMED', 'CLOSED'];

export const CATEGORY_ICONS = {
  Electronics: Smartphone,
  'ID Cards': IdCard,
  Books: BookOpen,
  Bags: Backpack,
  Keys: KeyRound,
  Clothing: Shirt,
  Wallets: Wallet,
  Other: Package,
};

/** "ID Cards" -> "cat-id-cards" (tint classes live in index.css). */
export const categoryClass = (category) => `cat-${String(category || 'Other').toLowerCase().replace(/\s+/g, '-')}`;

export const CAMPUS_NAME = import.meta.env.VITE_CAMPUS_NAME || 'SRM Campus';
