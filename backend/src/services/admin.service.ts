import { User } from '../models/user.model.js';
import { Post } from '../models/post.model.js';
import { Comment } from '../models/comment.model.js';

export async function getStats() {
  const [totalUsers, totalPosts, visibleComments] = await Promise.all([
    User.countDocuments(),
    Post.countDocuments({ deletedAt: null }),
    Comment.aggregate([
      { $lookup: { from: 'posts', localField: 'post', foreignField: '_id', as: 'parent' } },
      { $match: { 'parent.0.deletedAt': null } },
      { $count: 'total' },
    ]),
  ]);
  return { totalUsers, totalPosts, totalComments: visibleComments[0]?.total ?? 0 };
}
