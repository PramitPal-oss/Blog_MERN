import { Types } from "mongoose";
import { env } from "../src/config/env.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { User } from "../src/models/user.model.js";
import { Post } from "../src/models/post.model.js";
import { Comment } from "../src/models/comment.model.js";
import { hashPassword } from "../src/utils/passwords.js";
import { slugBase } from "../src/utils/slug.js";

if (env.NODE_ENV === "production") throw new Error("Seed refuses to run in production");
const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@example.test").toLowerCase();
const userEmail = (process.env.SEED_USER_EMAIL ?? "user@example.test").toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD ?? "DemoAdmin!2026";
const userPassword = process.env.SEED_USER_PASSWORD ?? "DemoUser!2026";
await connectDatabase();
try {
  let admin = await User.findOne({ isProtectedAdmin: true });
  if (!admin) {
    if (await User.exists({ email: adminEmail })) throw new Error("ADMIN_EMAIL already belongs to a non-protected account");
    admin = await User.create({ name: process.env.ADMIN_NAME ?? "Demo Administrator", email: adminEmail, passwordHash: await hashPassword(adminPassword), role: "ADMIN", isProtectedAdmin: true });
  }
  let user = await User.findOne({ email: userEmail });
  if (!user) user = await User.create({ name: "Demo User", email: userEmail, passwordHash: await hashPassword(userPassword) });
  for (let i = 1; i <= 5; i++) {
    const _id = new Types.ObjectId(`65000000000000000000000${i}`);
    await Post.updateOne({ _id }, { $setOnInsert: { title: `Sample Post ${i}`, content: `This is seeded sample post ${i}.`, slug: `${slugBase(`Sample Post ${i}`)}-${_id}`, author: i % 2 ? user._id : admin._id } }, { upsert: true });
    for (let j = 1; j <= 2; j++) {
      const cid = new Types.ObjectId(`6600000000000000000000${i}${j}`);
      await Comment.updateOne({ _id: cid }, { $setOnInsert: { content: `Seeded comment ${j} on post ${i}.`, post: _id, author: j % 2 ? admin._id : user._id } }, { upsert: true });
    }
  }
  console.log("Development seed complete");
} finally { await disconnectDatabase(); }
