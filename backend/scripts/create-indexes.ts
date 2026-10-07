import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { User } from "../src/models/user.model.js";
import { Post } from "../src/models/post.model.js";
import { Comment } from "../src/models/comment.model.js";
import { RefreshSession } from "../src/models/refresh-session.model.js";
import { OAuthTransaction } from "../src/models/oauth-transaction.model.js";
import { Notification } from "../src/models/notification.model.js";
await connectDatabase();
try { await Promise.all([User.createIndexes(), Post.createIndexes(), Comment.createIndexes(), RefreshSession.createIndexes(), OAuthTransaction.createIndexes(), Notification.createIndexes()]); console.log("Indexes created"); }
finally { await disconnectDatabase(); }
