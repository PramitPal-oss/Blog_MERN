import "dotenv/config";
import { z } from "zod";

const optionalPair = (data: Record<string, unknown>, a: string, b: string, ctx: z.RefinementCtx) => {
  if (Boolean(data[a]) !== Boolean(data[b])) ctx.addIssue({ code: "custom", message: `${a} and ${b} must be configured together` });
};

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  LOG_LEVEL: z.string().default("info"),
  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/mern_blog"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  BACKEND_URL: z.string().url().default("http://localhost:5000"),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().default("mern-blog-api"),
  JWT_ACCESS_AUDIENCE: z.string().default("mern-blog-web"),
  JWT_REFRESH_AUDIENCE: z.string().default("mern-blog-refresh"),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(604800),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  COOKIE_SECURE: z.enum(["true", "false"]).default("false").transform(v => v === "true"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().default("http://localhost:5000/api/v1/auth/google/callback"),
  FACEBOOK_CLIENT_ID: z.string().optional(),
  FACEBOOK_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_CALLBACK_URL: z.string().url().default("http://localhost:5000/api/v1/auth/facebook/callback"),
  AUTH_RATE_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  AUTH_RATE_MAX: z.coerce.number().int().positive().default(120),
  LOGIN_RATE_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  LOGIN_RATE_MAX: z.coerce.number().int().positive().default(10),
  REGISTER_RATE_WINDOW_MS: z.coerce.number().int().positive().default(3600000),
  REGISTER_RATE_MAX: z.coerce.number().int().positive().default(10),
  OAUTH_RATE_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  OAUTH_RATE_MAX: z.coerce.number().int().positive().default(20)
}).superRefine((data, ctx) => {
  optionalPair(data, "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", ctx);
  optionalPair(data, "FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET", ctx);
  if (data.JWT_ACCESS_SECRET === data.JWT_REFRESH_SECRET) ctx.addIssue({ code: "custom", message: "JWT secrets must differ" });
  if (data.NODE_ENV === "production" && (!data.COOKIE_SECURE || !data.FRONTEND_URL.startsWith("https://") || !data.BACKEND_URL.startsWith("https://"))) {
    ctx.addIssue({ code: "custom", message: "Production requires HTTPS URLs and secure cookies" });
  }
});

export const env = schema.parse(process.env);
export const oauthEnabled = { google: Boolean(env.GOOGLE_CLIENT_ID), facebook: Boolean(env.FACEBOOK_CLIENT_ID) };
