import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/user.model.js';
import { hashPassword } from '../src/utils/passwords.js';

const name = process.env.ADMIN_NAME;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!name || !email || !password) throw new Error('ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD are required');
await connectDatabase();
try {
  const existing = await User.findOne({ isProtectedAdmin: true });
  if (existing) console.log(`Protected admin already exists: ${existing.email ?? existing._id}`);
  else {
    if (await User.exists({ email })) throw new Error('ADMIN_EMAIL already belongs to another account');
    await User.create({
      name,
      email,
      passwordHash: await hashPassword(password),
      role: 'ADMIN',
      isProtectedAdmin: true,
    });
    console.log(`Protected admin created: ${email}`);
  }
} finally {
  await disconnectDatabase();
}
