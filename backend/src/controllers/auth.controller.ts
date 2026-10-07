import type { RequestHandler, Response } from "express";
import { env, oauthEnabled } from "../config/env.js";
import { oauthBindingCookieName, oauthCookieOptions, refreshCookieName, refreshCookieOptions } from "../config/cookies.js";
import * as authService from "../services/auth.service.js";
import { User } from "../models/user.model.js";
import { userDto } from "../utils/serializers.js";
import { sendSuccess } from "../utils/responses.js";
import { AppError } from "../utils/app-error.js";
import { createOAuthTransaction, consumeOAuthTransaction, resolveOAuth } from "../services/oauth.service.js";
import { passport, type ProviderProfile } from "../config/passport.js";

const setRefresh = (res: Response, token: string) => res.cookie(refreshCookieName, token, refreshCookieOptions);
const authPayload = (result: authService.AuthResult) => ({ user: result.user, accessToken: result.accessToken, expiresIn: result.expiresIn });

export const register: RequestHandler = async (req, res) => { req.activity = { action: "AUTH_REGISTER" }; const result = await authService.register(req.validated!.body); setRefresh(res, result.refreshToken); res.set("Cache-Control", "no-store"); sendSuccess(res, 201, "Registration successful", authPayload(result)); };
export const login: RequestHandler = async (req, res) => { req.activity = { action: "AUTH_LOGIN" }; const result = await authService.login(req.validated!.body); setRefresh(res, result.refreshToken); res.set("Cache-Control", "no-store"); sendSuccess(res, 200, "Login successful", authPayload(result)); };
export const refresh: RequestHandler = async (req, res) => { const token = req.cookies?.[refreshCookieName]; if (!token) throw new AppError(401, "SESSION_INVALID", "Refresh cookie is missing"); const result = await authService.rotateRefreshToken(token); setRefresh(res, result.refreshToken); res.set("Cache-Control", "no-store"); sendSuccess(res, 200, "Session refreshed", authPayload(result)); };
export const logout: RequestHandler = async (req, res) => { req.activity = { action: "AUTH_LOGOUT" }; await authService.logout(req.cookies?.[refreshCookieName]); res.clearCookie(refreshCookieName, refreshCookieOptions); sendSuccess(res, 200, "Logged out", null); };
export const me: RequestHandler = async (req, res) => { const user = await User.findById(req.auth!.userId).select("+passwordHash").lean(); if (!user) throw new AppError(404, "USER_NOT_FOUND", "User was not found"); sendSuccess(res, 200, "Current user retrieved", { user: userDto(user) }); };
export const providers: RequestHandler = (_req, res) => sendSuccess(res, 200, "OAuth provider status", oauthEnabled);

export const oauthStart = (provider: "google" | "facebook"): RequestHandler => async (req, res, next) => {
  if (!oauthEnabled[provider]) throw new AppError(503, "OAUTH_NOT_CONFIGURED", `${provider} login is not configured`);
  let state = typeof req.query.state === "string" ? req.query.state : undefined;
  if (!state) {
    const tx = await createOAuthTransaction(provider, "login"); state = tx.state; res.cookie(oauthBindingCookieName, tx.binding, oauthCookieOptions);
  }
  const options: any = { state, session: false, scope: provider === "google" ? ["profile", "email"] : ["email"] };
  passport.authenticate(provider, options)(req, res, next);
};

export const oauthLink = (provider: "google" | "facebook"): RequestHandler => async (req, res) => {
  if (!oauthEnabled[provider]) throw new AppError(503, "OAUTH_NOT_CONFIGURED", `${provider} login is not configured`);
  const tx = await createOAuthTransaction(provider, "link", req.auth!.userId, req.auth!.sessionId);
  res.cookie(oauthBindingCookieName, tx.binding, oauthCookieOptions);
  sendSuccess(res, 200, "OAuth linking started", { authorizationUrl: `${env.BACKEND_URL}/api/v1/auth/${provider}?state=${encodeURIComponent(tx.state)}` });
};

const errorCode = (error: any) => error instanceof AppError ? error.code : "OAUTH_FAILED";
export const oauthCallback = (provider: "google" | "facebook"): RequestHandler => async (req, res, next) => {
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const binding = req.cookies?.[oauthBindingCookieName] ?? "";
  if (!state || !binding) return res.redirect(`${env.FRONTEND_URL}/login?oauthError=OAUTH_STATE_INVALID`);
  let purpose: "login" | "link" = "login";
  passport.authenticate(provider, { session: false }, async (error: unknown, profile: ProviderProfile | false) => {
    try {
      if (error || !profile) throw new AppError(401, "OAUTH_FAILED", "OAuth authentication failed");
      const transaction = await consumeOAuthTransaction(state, binding, provider);
      purpose = transaction.purpose;
      const result = await resolveOAuth(profile, transaction);
      res.clearCookie(oauthBindingCookieName, oauthCookieOptions);
      if (result.purpose === "link") return res.redirect(`${env.FRONTEND_URL}/account?linked=${provider}`);
      setRefresh(res, result.auth.refreshToken);
      return res.redirect(`${env.FRONTEND_URL}/auth/callback`);
    } catch (caught) {
      res.clearCookie(oauthBindingCookieName, oauthCookieOptions);
      return res.redirect(`${env.FRONTEND_URL}/${purpose === "link" ? "account" : "login"}?oauthError=${errorCode(caught)}`);
    }
  })(req, res, next);
};
