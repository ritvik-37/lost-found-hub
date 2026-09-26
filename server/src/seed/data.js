// Demo data for the hackathon. Starts from the UI prototype's sample items and adds more so every
// screen is populated. Dates are relative to "today" so the demo always looks fresh.

// No passwords live in the code: seed.js takes them from DEMO_ADMIN_PASSWORD / DEMO_STUDENT_PASSWORD
// or generates random ones. Judges use the one-click demo sign-in (POST /api/auth/demo) instead.
export const users = [
  { key: 'admin', name: 'Campus Admin', email: 'admin@campus.edu', role: 'admin', phone: '+91 44 2741 0000', demoLabel: 'Admin' },
  { key: 'avneet', name: 'Avneet Singh', email: 'avneet@campus.edu', role: 'user', phone: '+91 98765 11111', demoLabel: 'Student (Avneet)' },
  { key: 'rahul', name: 'Rahul Mehta', email: 'rahul@campus.edu', role: 'user', demoLabel: 'Student (Rahul)' },
  { key: 'sneha', name: 'Sneha Krishnan', email: 'sneha@campus.edu', role: 'user' },
  { key: 'arjun', name: 'Arjun Patel', email: 'arjun@campus.edu', role: 'user' },
];

/** Accounts offered as one-click demo sign-in buttons. */
export const DEMO_ACCOUNTS = users
  .filter((u) => u.demoLabel)
  .map(({ key, demoLabel, email, role }) => ({ key, label: demoLabel, email, role }));

/**
 * daysAgo: when it was lost/found (and roughly when it was reported).
 * Match pairs worth demoing:
 *  - bottleLost <-> bottleFound (blue bottle at the Sports Complex; ~98%)
 *  - earbudsLost <-> jbl (JBL earbuds at the Main Library)
 *  - backpackLost <-> backpackFound (the found one is PENDING: verify it live to reveal the match)
 */
export const items = [
  { key: 'jbl', by: 'rahul', type: 'FOUND', title: 'Black JBL earbuds case', category: 'Electronics', location: 'Main Library', exactSpot: '2nd floor reading hall', daysAgo: 1, status: 'VERIFIED',
    description: 'Black JBL case with a small scratch on the lid, found on a reading table.', hiddenDetails: 'Left earbud has a red sticker' },
  { key: 'bottleLost', by: 'avneet', type: 'LOST', title: 'Blue Milton water bottle', category: 'Other', location: 'Sports Complex', exactSpot: 'Basketball court', daysAgo: 2, status: 'VERIFIED',
    description: 'Navy blue steel bottle, 750 ml, with a dent near the bottom.', hiddenDetails: 'Initials A.S. scratched on the cap' },
  { key: 'idCard', by: 'sneha', type: 'FOUND', title: 'SRM student ID card', category: 'ID Cards', location: 'Java Canteen', daysAgo: 0, status: 'VERIFIED',
    description: 'Student ID card with a green lanyard, CSE department.', hiddenDetails: 'Reg. no ends in 4417' },
  { key: 'bottleFound', by: 'arjun', type: 'FOUND', title: 'Steel water bottle, blue', category: 'Other', location: 'Sports Complex', exactSpot: 'Bench by the basketball court', daysAgo: 1, status: 'VERIFIED',
    description: 'Blue steel bottle found near the basketball court bench, has a dent.', hiddenDetails: 'Initials scratched on cap' },
  { key: 'backpackLost', by: 'rahul', type: 'LOST', title: 'Grey Wildcraft backpack', category: 'Bags', location: 'Tech Park', daysAgo: 3, status: 'VERIFIED',
    description: 'Grey backpack with laptop sleeve, keychain of a small football.', hiddenDetails: 'Has a DSA notebook inside' },
  { key: 'bikeKeys', by: 'sneha', type: 'FOUND', title: 'Bike keys with red tag', category: 'Keys', location: 'Parking Lot', exactSpot: 'Two-wheeler bay near Gate 2', daysAgo: 2, status: 'CLAIMED',
    description: 'Two keys on a ring with a red plastic tag, Honda logo.', hiddenDetails: 'Tag says "Room 214"' },
  { key: 'textbook', by: 'arjun', type: 'FOUND', title: 'Engineering Mathematics textbook', category: 'Books', location: 'University Building', daysAgo: 4, status: 'VERIFIED',
    description: 'Engineering Mathematics Vol 2, highlighted pages, brown cover.', hiddenDetails: 'Name on first page: Priya' },
  { key: 'walletLost', by: 'sneha', type: 'LOST', title: 'Brown leather wallet', category: 'Wallets', location: 'Hostel Block A', daysAgo: 5, status: 'CLOSED', statusNote: 'Owner confirmed it was returned.',
    description: 'Brown bifold leather wallet, slightly worn on edges.', hiddenDetails: 'Contains a metro card' },
  { key: 'hoodie', by: 'rahul', type: 'FOUND', title: 'Black hoodie, size M', category: 'Clothing', location: 'Auditorium', exactSpot: 'Seat row F', daysAgo: 1, status: 'PENDING',
    description: 'Plain black hoodie size M left on seat row F after the fest.', hiddenDetails: 'Small ink stain on left sleeve' },
  { key: 'calculator', by: 'avneet', type: 'LOST', title: 'Casio fx-991ES calculator', category: 'Electronics', location: 'Bio-Tech Block', daysAgo: 0, status: 'PENDING',
    description: 'Grey Casio scientific calculator with a cracked cover.', hiddenDetails: 'Sticker of a cat on the back' },
  { key: 'watch', by: 'arjun', type: 'FOUND', title: 'Silver wristwatch', category: 'Other', location: 'Java Canteen', exactSpot: 'Handwash area', daysAgo: 12, status: 'VERIFIED',
    description: 'Silver analog watch with a metal strap, found by the handwash area.', hiddenDetails: 'Engraving on the back' },
  { key: 'charger', by: 'rahul', type: 'FOUND', title: 'Laptop charger 65W', category: 'Electronics', location: 'Tech Park', exactSpot: 'Lab TP-402', daysAgo: 3, status: 'REJECTED', statusNote: 'Already handed to the lab assistant; duplicate report.',
    description: 'Black 65W USB-C laptop charger, found in lab TP-402.', hiddenDetails: 'No identifying marks' },
  { key: 'earbudsLost', by: 'sneha', type: 'LOST', title: 'JBL wireless earbuds', category: 'Electronics', location: 'Main Library', daysAgo: 2, status: 'VERIFIED',
    description: 'Black JBL wireless earbuds in their charging case, lost near the reading tables.', hiddenDetails: 'Red sticker on one earbud' },
  { key: 'backpackFound', by: 'arjun', type: 'FOUND', title: 'Grey backpack with football keychain', category: 'Bags', location: 'Tech Park', exactSpot: 'Lab TP-305', daysAgo: 2, status: 'PENDING',
    description: 'Grey backpack with a small football keychain, left in a Tech Park lab after 5pm.', hiddenDetails: 'Notebook inside labelled DSA' },
  { key: 'roomKeys', by: 'arjun', type: 'LOST', title: 'Hostel room keys on blue lanyard', category: 'Keys', location: 'Hostel Block B', daysAgo: 1, status: 'VERIFIED',
    description: 'Two silver keys on a blue lanyard with a small whistle keyring.', hiddenDetails: 'Paper tag with room 312' },
  { key: 'jacket', by: 'rahul', type: 'LOST', title: 'Denim jacket', category: 'Clothing', location: 'Java Canteen', daysAgo: 4, status: 'VERIFIED',
    description: 'Light blue denim jacket with a torn left pocket, left on a chair.', hiddenDetails: 'Bookstore receipt in the pocket' },
  { key: 'umbrella', by: 'avneet', type: 'FOUND', title: 'Navy foldable umbrella', category: 'Other', location: 'Auditorium', exactSpot: 'Main entrance', daysAgo: 3, status: 'VERIFIED',
    description: 'Navy foldable umbrella with a wooden handle, found near the entrance.', hiddenDetails: 'Initials carved into the handle' },
  { key: 'hostelId', by: 'rahul', type: 'LOST', title: 'Hostel ID card', category: 'ID Cards', location: 'Hostel Block B', daysAgo: 5, status: 'VERIFIED',
    description: 'Hostel ID card in a transparent holder with a photo on the front.', hiddenDetails: 'Hostel ID number ends in 88' },
  { key: 'notebook', by: 'sneha', type: 'FOUND', title: 'Spiral notebook with DSA notes', category: 'Books', location: 'Tech Park', exactSpot: 'Lab TP-301', daysAgo: 0, status: 'PENDING',
    description: 'Spiral notebook with handwritten data structures notes and sticky flags.', hiddenDetails: 'A name is written on the last page' },
  { key: 'spectacles', by: 'arjun', type: 'FOUND', title: 'Spectacles in black case', category: 'Other', location: 'Main Library', exactSpot: 'Study carrel, ground floor', daysAgo: 5, status: 'CLAIMED',
    description: 'Black-rimmed spectacles inside a hard black case, found on a study carrel.', hiddenDetails: 'Optician sticker from Chennai inside the case' },
  { key: 'pencil', by: 'avneet', type: 'LOST', title: 'Apple Pencil (2nd gen)', category: 'Electronics', location: 'University Building', exactSpot: 'Room UB-304', daysAgo: 10, status: 'CLOSED', statusNote: 'Found by the owner.',
    description: 'White Apple Pencil 2nd generation, lost during a lecture in room UB-304.', hiddenDetails: 'Small scratch near the tip' },
  { key: 'powerbank', by: 'rahul', type: 'FOUND', title: 'White power bank 10000mAh', category: 'Electronics', location: 'Hostel Block A', exactSpot: 'Common room', daysAgo: 6, status: 'VERIFIED',
    description: 'White 10000mAh power bank with a USB-C cable wrapped around it.', hiddenDetails: 'Cable has green tape on it' },
];

export const claims = [
  { item: 'bikeKeys', by: 'avneet', status: 'APPROVED', adminRemarks: 'Collect from the Security Office, Admin Block.',
    proofAnswer: 'The red tag says Room 214, it is my hostel room.', message: 'These are my bike keys, lost them on Monday.' },
  { item: 'bikeKeys', by: 'arjun', status: 'REJECTED', adminRemarks: 'Another claim was approved for this item.',
    proofAnswer: 'Honda keys with a red tag, I park near Gate 2.', message: '' },
  { item: 'jbl', by: 'sneha', status: 'PENDING',
    proofAnswer: 'There is a red sticker on the left earbud.', message: 'Lost it during my library slot.' },
  { item: 'bottleFound', by: 'avneet', status: 'PENDING',
    proofAnswer: 'My initials A.S. are scratched on the cap.', message: 'I think this is my bottle from the sports complex.' },
  { item: 'watch', by: 'sneha', status: 'PENDING',
    proofAnswer: 'The strap has one extra hole that I punched myself.', message: 'Lost it at lunch last week.' },
  { item: 'textbook', by: 'rahul', status: 'REJECTED', adminRemarks: 'The name inside the book does not match. Visit the help desk if you have other proof.',
    proofAnswer: 'My name is written on the inside cover.', message: '' },
  { item: 'spectacles', by: 'rahul', status: 'APPROVED', adminRemarks: 'Approved. Collect from the Security Office with your student ID.',
    proofAnswer: 'The case has a sticker from an optician in Chennai.', message: 'I study on the ground floor every day.' },
];
