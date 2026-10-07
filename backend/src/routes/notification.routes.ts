import { Router } from "express";
import * as controller from "../controllers/notification.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { trustedOrigin } from "../middleware/trusted-origin.js";
import { validate } from "../middleware/validate.js";
import { pagination, noBody } from "../validators/common.schemas.js";
import { notificationIdParams } from "../validators/notification.schemas.js";

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get(
  "/",
  validate({ query: pagination }),
  controller.list
);

notificationsRouter.patch(
  "/read-all",
  trustedOrigin,
  validate({ body: noBody }),
  controller.readAll
);

notificationsRouter.patch(
  "/:id/read",
  trustedOrigin,
  validate({ params: notificationIdParams, body: noBody }),
  controller.readOne
);
