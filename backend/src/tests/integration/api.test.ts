import request from "supertest";
import { app } from "../../app.js";
import { User } from "../../models/user.model.js";
import { Post } from "../../models/post.model.js";
import { hashPassword } from "../../utils/passwords.js";

const origin = "http://localhost:5173";
const mutate = (req: request.Test) => req.set("Origin", origin).set("Content-Type", "application/json");
const cookie = (response: request.Response) => {
  const value = response.headers["set-cookie"] as unknown as string[];
  return value?.[0]?.split(";")[0] ?? "";
};
async function register(email = "user@example.test", name = "User") {
  const response = await mutate(request(app).post("/api/v1/auth/register")).send({ name, email, password: "StrongPass!123" });
  expect(response.status).toBe(201);
  return { token: response.body.data.accessToken as string, user: response.body.data.user, cookie: cookie(response) };
}
async function admin() {
  await User.create({ name: "Admin", email: "admin@example.test", passwordHash: await hashPassword("StrongPass!123"), role: "ADMIN", isProtectedAdmin: true });
  const response = await mutate(request(app).post("/api/v1/auth/login")).send({ email: "admin@example.test", password: "StrongPass!123" });
  return { token: response.body.data.accessToken as string, user: response.body.data.user };
}

describe("authentication lifecycle", () => {
  it("registers, normalizes email, excludes secrets and blocks duplicates", async () => {
    const first = await mutate(request(app).post("/api/v1/auth/register")).send({ name: "Test User", email: " TEST@EXAMPLE.TEST ", password: "StrongPass!123" });
    expect(first.status).toBe(201);
    expect(first.body.data.user.email).toBe("test@example.test");
    expect(first.body.data.user).not.toHaveProperty("passwordHash");
    expect(first.headers["set-cookie"]?.[0]).toContain("HttpOnly");
    const duplicate = await mutate(request(app).post("/api/v1/auth/register")).send({ name: "Other", email: "test@example.test", password: "StrongPass!123" });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("EMAIL_ALREADY_EXISTS");
  });

  it("rejects wrong credentials and untrusted origins", async () => {
    await register();
    const wrong = await mutate(request(app).post("/api/v1/auth/login")).send({ email: "user@example.test", password: "WrongPassword!" });
    expect(wrong.status).toBe(401);
    const untrusted = await request(app).post("/api/v1/auth/login").set("Origin", "https://evil.example").send({ email: "user@example.test", password: "StrongPass!123" });
    expect(untrusted.status).toBe(403);
  });

  it("rotates refresh tokens, detects reuse, and revokes the session", async () => {
    const registered = await register();
    const refreshed = await mutate(request(app).post("/api/v1/auth/refresh")).set("Cookie", registered.cookie).send({});
    expect(refreshed.status).toBe(200);
    const reused = await mutate(request(app).post("/api/v1/auth/refresh")).set("Cookie", registered.cookie).send({});
    expect(reused.status).toBe(401);
    expect(reused.body.error.code).toBe("REFRESH_TOKEN_REUSED");
    const protectedResponse = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${refreshed.body.data.accessToken}`);
    expect(protectedResponse.status).toBe(401);
  });

  it("revokes the active session on logout", async () => {
    const registered = await register();
    const response = await mutate(request(app).post("/api/v1/auth/logout")).set("Cookie", registered.cookie).send({});
    expect(response.status).toBe(200);
    expect((await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${registered.token}`)).status).toBe(401);
  });

  it("reports disabled OAuth providers without breaking local authentication", async () => {
    const response = await request(app).get("/api/v1/auth/providers");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ google: false, facebook: false });
    expect((await request(app).get("/api/v1/auth/google")).status).toBe(503);
  });
});

describe("posts and authorization", () => {
  it("enforces ownership, keeps stable slugs, and soft deletes", async () => {
    const owner = await register("owner@example.test", "Owner");
    const other = await register("other@example.test", "Other");
    const created = await mutate(request(app).post("/api/v1/posts")).set("Authorization", `Bearer ${owner.token}`).send({ title: "Learning MERN", content: "A useful article" });
    expect(created.status).toBe(201);
    expect(created.body.data.slug).toMatch(/^learning-mern-[a-f\d]{24}$/);
    const id = created.body.data.id;
    const denied = await mutate(request(app).patch(`/api/v1/posts/${id}`)).set("Authorization", `Bearer ${other.token}`).send({ title: "Stolen title" });
    expect(denied.status).toBe(403);
    const updated = await mutate(request(app).patch(`/api/v1/posts/${id}`)).set("Authorization", `Bearer ${owner.token}`).send({ title: "A new title" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.slug).toBe(created.body.data.slug);
    const removed = await mutate(request(app).delete(`/api/v1/posts/${id}`)).set("Authorization", `Bearer ${owner.token}`).send({});
    expect(removed.status).toBe(200);
    expect(await Post.exists({ _id: id, deletedAt: { $ne: null } })).toBeTruthy();
    expect((await request(app).get(`/api/v1/posts/${id}`)).status).toBe(404);
  });

  it("allows admins to manage another user's post and see deleted posts", async () => {
    const owner = await register(); const administrator = await admin();
    const post = await mutate(request(app).post("/api/v1/posts")).set("Authorization", `Bearer ${owner.token}`).send({ title: "Owned post", content: "Content" });
    expect((await mutate(request(app).patch(`/api/v1/posts/${post.body.data.id}`)).set("Authorization", `Bearer ${administrator.token}`).send({ title: "Admin edited" })).status).toBe(200);
    await mutate(request(app).delete(`/api/v1/posts/${post.body.data.id}`)).set("Authorization", `Bearer ${administrator.token}`).send({});
    const deleted = await request(app).get("/api/v1/admin/posts?status=deleted").set("Authorization", `Bearer ${administrator.token}`);
    expect(deleted.status).toBe(200);
    expect(deleted.body.data).toHaveLength(1);
  });
});

describe("comments and administration", () => {
  it("enforces comment ownership and permits admin moderation", async () => {
    const owner = await register("writer@example.test", "Writer");
    const other = await register("reader@example.test", "Reader");
    const administrator = await admin();
    const post = await mutate(request(app).post("/api/v1/posts")).set("Authorization", `Bearer ${owner.token}`).send({ title: "Comment target", content: "Content" });
    const comment = await mutate(request(app).post(`/api/v1/posts/${post.body.data.id}/comments`)).set("Authorization", `Bearer ${owner.token}`).send({ content: "First" });
    expect(comment.status).toBe(201);
    const denied = await mutate(request(app).patch(`/api/v1/comments/${comment.body.data.id}`)).set("Authorization", `Bearer ${other.token}`).send({ content: "No" });
    expect(denied.status).toBe(403);
    const edited = await mutate(request(app).patch(`/api/v1/comments/${comment.body.data.id}`)).set("Authorization", `Bearer ${administrator.token}`).send({ content: "Moderated" });
    expect(edited.status).toBe(200);
    expect((await mutate(request(app).delete(`/api/v1/comments/${comment.body.data.id}`)).set("Authorization", `Bearer ${administrator.token}`).send({})).status).toBe(200);
  });

  it("rejects regular users from admin APIs and calculates dashboard totals", async () => {
    const user = await register(); const administrator = await admin();
    expect((await request(app).get("/api/v1/admin/stats").set("Authorization", `Bearer ${user.token}`)).status).toBe(403);
    const post = await mutate(request(app).post("/api/v1/posts")).set("Authorization", `Bearer ${user.token}`).send({ title: "Dashboard post", content: "Content" });
    await mutate(request(app).post(`/api/v1/posts/${post.body.data.id}/comments`)).set("Authorization", `Bearer ${user.token}`).send({ content: "Visible" });
    const stats = await request(app).get("/api/v1/admin/stats").set("Authorization", `Bearer ${administrator.token}`);
    expect(stats.status).toBe(200);
    expect(stats.body.data).toEqual({ totalUsers: 2, totalPosts: 1, totalComments: 1 });
  });

  it("protects the bootstrap admin and validates payloads", async () => {
    const administrator = await admin();
    const update = await mutate(request(app).patch(`/api/v1/users/${administrator.user.id}`)).set("Authorization", `Bearer ${administrator.token}`).send({ isActive: false });
    expect(update.status).toBe(409);
    expect(update.body.error.code).toBe("ADMIN_PROTECTED");
    const invalid = await mutate(request(app).post("/api/v1/posts")).set("Authorization", `Bearer ${administrator.token}`).send({ title: "x", content: "" });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("lets an admin create and update users while invalidating changed sessions", async () => {
    const target = await register("target@example.test", "Target");
    const administrator = await admin();
    const created = await mutate(request(app).post("/api/v1/users")).set("Authorization", `Bearer ${administrator.token}`).send({ name: "Managed", email: "managed@example.test", password: "StrongPass!123", role: "USER" });
    expect(created.status).toBe(201);
    const listed = await request(app).get("/api/v1/users").set("Authorization", `Bearer ${administrator.token}`);
    expect(listed.status).toBe(200);
    expect(listed.body.meta.total).toBe(3);
    const changed = await mutate(request(app).patch(`/api/v1/users/${target.user.id}`)).set("Authorization", `Bearer ${administrator.token}`).send({ role: "ADMIN" });
    expect(changed.status).toBe(200);
    expect((await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${target.token}`)).status).toBe(401);
  });
});
