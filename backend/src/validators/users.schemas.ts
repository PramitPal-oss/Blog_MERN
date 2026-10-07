import { z } from "zod";
import { ROLES } from "../constants/roles.js";
const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(10).refine(v => Buffer.byteLength(v, "utf8") <= 72, "Password must not exceed 72 UTF-8 bytes");
export const userCreateSchema = z.object({ name: z.string().trim().min(2).max(80), email, password, role: z.enum(ROLES).default("USER") }).strict();
export const userUpdateSchema = z.object({ name: z.string().trim().min(2).max(80).optional(), email: email.optional(), role: z.enum(ROLES).optional(), isActive: z.boolean().optional() }).strict().refine(v => Object.keys(v).length > 0, "At least one field is required");
