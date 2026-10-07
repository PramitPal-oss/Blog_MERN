import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { env, oauthEnabled } from "./env.js";

export type ProviderProfile = { provider: "google" | "facebook"; providerId: string; name: string; email?: string };

if (oauthEnabled.google) {
  passport.use(new GoogleStrategy({ clientID: env.GOOGLE_CLIENT_ID!, clientSecret: env.GOOGLE_CLIENT_SECRET!, callbackURL: env.GOOGLE_CALLBACK_URL }, (_access, _refresh, profile, done) => {
    const value: ProviderProfile = { provider: "google", providerId: profile.id, name: profile.displayName || "Google User" };
    if (profile.emails?.[0]?.value) value.email = profile.emails[0].value.toLowerCase();
    done(null, value as any);
  }));
}
if (oauthEnabled.facebook) {
  passport.use(new FacebookStrategy({ clientID: env.FACEBOOK_CLIENT_ID!, clientSecret: env.FACEBOOK_CLIENT_SECRET!, callbackURL: env.FACEBOOK_CALLBACK_URL, profileFields: ["id", "displayName", "emails"] }, (_access, _refresh, profile, done) => {
    const value: ProviderProfile = { provider: "facebook", providerId: profile.id, name: profile.displayName || "Facebook User" };
    if (profile.emails?.[0]?.value) value.email = profile.emails[0].value.toLowerCase();
    done(null, value as any);
  }));
}

export { passport };
