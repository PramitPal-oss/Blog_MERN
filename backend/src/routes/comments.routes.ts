import { Router } from "express";
import { z } from "zod";
import * as controller from "../controllers/comments.controller.js";
import { authenticate, optionalAuthenticate } from "../middleware/authenticate.js";
import { requireCommentOwnershipOrAdmin } from "../middleware/ownership.js";
import { trustedOrigin } from "../middleware/trusted-origin.js";
import { validate } from "../middleware/validate.js";
import { objectId, noBody } from "../validators/common.schemas.js";
import { commentSchema } from "../validators/comment.schemas.js";
export const commentsRouter = Router();
const idParams = z.object({ id: objectId }).strict();
import { pagination } from "../validators/common.schemas.js";

commentsRouter.get("/:id/replies", optionalAuthenticate, validate({ params: idParams, query: pagination }), controller.listReplies);
commentsRouter.post("/:id/replies", trustedOrigin, authenticate, validate({ params: idParams, body: commentSchema }), controller.createReply);
commentsRouter.get("/:id", optionalAuthenticate, validate({ params: idParams }), controller.get);
commentsRouter.patch("/:id", trustedOrigin, authenticate, validate({ params: idParams, body: commentSchema }), requireCommentOwnershipOrAdmin, controller.update);
import * as likesController from "../controllers/likes.controller.js";

commentsRouter.put("/:id/like", trustedOrigin, authenticate, validate({ params: idParams, body: noBody }), likesController.likeComment);
commentsRouter.delete("/:id/like", trustedOrigin, authenticate, validate({ params: idParams, body: noBody }), likesController.unlikeComment);
commentsRouter.delete("/:id", trustedOrigin, authenticate, validate({ params: idParams, body: noBody }), requireCommentOwnershipOrAdmin, controller.remove);
