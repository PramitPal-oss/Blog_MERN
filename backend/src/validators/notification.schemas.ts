import { z } from "zod";
import { objectId } from "./common.schemas.js";

export const notificationIdParams = z.object({
  id: objectId
}).strict();
