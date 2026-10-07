import type { CookieOptions } from 'express';
import { env } from './env.js';
export const refreshCookieName = 'blog_refresh';
export const oauthBindingCookieName = 'blog_oauth_binding';
export const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax',
  path: '/api/v1/auth',
  maxAge: env.JWT_REFRESH_TTL_SECONDS * 1000,
};
export const oauthCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax',
  path: '/api/v1/auth',
  maxAge: 10 * 60 * 1000,
};
