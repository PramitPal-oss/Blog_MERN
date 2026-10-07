import { User } from "../../models/user.model.js";
import { createOAuthTransaction, consumeOAuthTransaction, resolveOAuth } from "../../services/oauth.service.js";
import { hashPassword } from "../../utils/passwords.js";

describe("OAuth identity rules", () => {
  it("consumes a browser-bound state transaction exactly once", async () => {
    const created = await createOAuthTransaction("google", "login");
    const consumed = await consumeOAuthTransaction(created.state, created.binding, "google");
    expect(consumed.provider).toBe("google");
    await expect(consumeOAuthTransaction(created.state, created.binding, "google")).rejects.toMatchObject({ code: "OAUTH_STATE_INVALID" });
  });

  it("creates and reuses a provider-only account without inventing an email", async () => {
    const profile = { provider: "facebook" as const, providerId: "fb-123", name: "Facebook User" };
    const first = await resolveOAuth(profile, { purpose: "login" });
    expect(first.purpose).toBe("login");
    const stored = await User.findOne({ facebookId: "fb-123" }).lean();
    expect(stored?.email).toBeUndefined();
    const second = await resolveOAuth(profile, { purpose: "login" });
    expect(second.purpose).toBe("login");
    expect(await User.countDocuments({ facebookId: "fb-123" })).toBe(1);
  });

  it("refuses automatic linking when a provider email matches a local account", async () => {
    await User.create({ name: "Local", email: "same@example.test", passwordHash: await hashPassword("StrongPass!123") });
    await expect(resolveOAuth({ provider: "google", providerId: "google-456", name: "Google User", email: "same@example.test" }, { purpose: "login" })).rejects.toMatchObject({ code: "OAUTH_ACCOUNT_EXISTS" });
  });
});
