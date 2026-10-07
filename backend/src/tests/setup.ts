import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import { Comment } from "../models/comment.model.js";
import { RefreshSession } from "../models/refresh-session.model.js";
import { OAuthTransaction } from "../models/oauth-transaction.model.js";
import { Notification } from "../models/notification.model.js";



let server: MongoMemoryServer;
beforeAll(async () => {
  server = await MongoMemoryServer.create();
  await mongoose.connect(server.getUri());
  await Promise.all([User.init(), Post.init(), Comment.init(), RefreshSession.init(), OAuthTransaction.init(), Notification.init()]);
});
beforeEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map(collection => collection.deleteMany({})));
});
afterAll(async () => { await mongoose.disconnect(); await server.stop(); });
