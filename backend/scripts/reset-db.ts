import { Types } from "mongoose";
import { env } from "../src/config/env.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { User } from "../src/models/user.model.js";
import { Post } from "../src/models/post.model.js";
import { Comment } from "../src/models/comment.model.js";
import { Notification } from "../src/models/notification.model.js";
import { hashPassword } from "../src/utils/passwords.js";
import { slugBase } from "../src/utils/slug.js";

if (env.NODE_ENV === "production") throw new Error("Seed refuses to run in production");

const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@example.test").toLowerCase();
const userEmail = (process.env.SEED_USER_EMAIL ?? "user@example.test").toLowerCase();
const user2Email = "author@example.test";

const adminPassword = process.env.ADMIN_PASSWORD ?? "DemoAdmin!2026";
const userPassword = process.env.SEED_USER_PASSWORD ?? "DemoUser!2026";

async function run() {
  await connectDatabase();
  try {
    console.log("Truncating database...");
    await User.deleteMany({});
    await Post.deleteMany({});
    await Comment.deleteMany({});
    await Notification.deleteMany({});
    console.log("Database truncated successfully.");

    console.log("Seeding users...");
    const admin = await User.create({
      name: process.env.ADMIN_NAME ?? "Demo Administrator",
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: "ADMIN",
      isProtectedAdmin: true,
    });

    const user1 = await User.create({
      name: "Jane Reader",
      email: userEmail,
      passwordHash: await hashPassword(userPassword),
    });

    const user2 = await User.create({
      name: "Arthur Writer",
      email: user2Email,
      passwordHash: await hashPassword(userPassword),
    });

    console.log("Seeding posts and comments...");
    
    // Post 1
    const post1 = await Post.create({
      title: "The Future of Web Development in 2026",
      content: "Web development is evolving faster than ever. With the rise of agentic AI coding assistants, developers are shifting from writing boilerplate to architecting systems. This post explores the major trends we expect to see over the next few years.\n\nFirst, full-stack frameworks are consolidating. We are seeing a convergence around a few highly optimized paradigms. React continues to dominate the UI space, but the tooling around it has gotten significantly smarter.\n\nSecond, the 'database at the edge' movement has matured. Data synchronization is now often handled seamlessly by intelligent ORMs and syncing engines.",
      slug: slugBase("The Future of Web Development in 2026") + "-" + new Types.ObjectId(),
      author: user2._id,
      likedBy: [admin._id, user1._id]
    });

    // Root Comment on Post 1
    const c1 = await Comment.create({
      content: "This is exactly what I've been saying! AI is completely changing how we build software.",
      post: post1._id,
      author: user1._id,
      likedBy: [user2._id]
    });

    // Reply to Root Comment
    await Comment.create({
      content: "I agree, Jane. It's a very exciting time to be an engineer.",
      post: post1._id,
      parentComment: c1._id,
      author: user2._id,
    });

    // Post 2
    const post2 = await Post.create({
      title: "Understanding Serverless Architecture",
      content: "Serverless architecture allows developers to build and run applications and services without managing infrastructure. In a serverless model, the cloud provider automatically provisions, scales, and manages the infrastructure required to run the code.\n\nBenefits include reduced operational overhead, automatic scaling, and a pay-as-you-go pricing model. However, it's not without challenges. Cold starts and vendor lock-in are real concerns that teams must navigate.",
      slug: slugBase("Understanding Serverless Architecture") + "-" + new Types.ObjectId(),
      author: admin._id,
      likedBy: [user1._id]
    });

    // Root Comment on Post 2
    await Comment.create({
      content: "I still worry about cold starts for latency-sensitive applications. Have things improved?",
      post: post2._id,
      author: user1._id,
    });

    // Tombstone Root Comment on Post 2
    const deletedComment = await Comment.create({
      content: "[deleted]",
      post: post2._id,
      author: user2._id,
      deletedAt: new Date()
    });

    // Reply to Tombstone
    await Comment.create({
      content: "Even though you deleted your comment, I completely disagree!",
      post: post2._id,
      parentComment: deletedComment._id,
      author: user1._id,
    });
    
    // Post 3
    await Post.create({
      title: "A Guide to Modern CSS",
      content: "CSS has come a long way. With CSS variables, Grid, and modern pseudo-selectors like :has(), we can achieve complex layouts and interactions without touching a single line of JavaScript.\n\nThis guide will walk you through the most powerful features added to the CSS specification in recent years.",
      slug: slugBase("A Guide to Modern CSS") + "-" + new Types.ObjectId(),
      author: user2._id,
    });

    console.log("Development database reset and seeded successfully.");
    console.log(`Admin Login: ${adminEmail} / ${adminPassword}`);
    console.log(`User Login: ${userEmail} / ${userPassword}`);
    console.log(`Author Login: ${user2Email} / ${userPassword}`);

  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await disconnectDatabase();
  }
}

void run();
