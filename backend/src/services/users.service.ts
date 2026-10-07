import { User } from "../models/user.model.js";
import { AppError } from "../utils/app-error.js";
import { hashPassword } from "../utils/passwords.js";
import { userDto } from "../utils/serializers.js";
import type { Role } from "../constants/roles.js";

export async function listUsers(page: number, limit: number) {
  const [users, total] = await Promise.all([
    User.find().select("+passwordHash").sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments()
  ]);
  return { items: users.map(userDto), total };
}

export async function getUser(userId: string) {
  const user = await User.findById(userId).select("+passwordHash").lean();
  if (!user) throw new AppError(404, "USER_NOT_FOUND", "User was not found");
  return userDto(user);
}

export async function createUser(input: { name: string; email: string; password: string; role: Role }) {
  try {
    const user = await User.create({ name: input.name, email: input.email, passwordHash: await hashPassword(input.password), role: input.role });
    const selected = await User.findById(user._id).select("+passwordHash").lean();
    return userDto(selected);
  } catch (error: any) {
    if (error?.code === 11000) throw new AppError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists");
    throw error;
  }
}

export async function updateUser(targetId: string, actorId: string, input: { name?: string; email?: string; role?: Role; isActive?: boolean }) {
  const user = await User.findById(targetId).select("+passwordHash");
  if (!user) throw new AppError(404, "USER_NOT_FOUND", "User was not found");
  const securityChange = (input.role !== undefined && input.role !== user.role) || (input.isActive !== undefined && input.isActive !== user.isActive);
  if (securityChange && (user.isProtectedAdmin || user._id.toString() === actorId) && (input.role === "USER" || input.isActive === false)) {
    throw new AppError(409, "ADMIN_PROTECTED", "This administrator cannot be demoted or deactivated");
  }
  if (input.name !== undefined) user.name = input.name;
  if (input.email !== undefined) user.email = input.email;
  if (input.role !== undefined) user.role = input.role;
  if (input.isActive !== undefined) user.isActive = input.isActive;
  if (securityChange) user.authVersion += 1;
  try { await user.save(); } catch (error: any) {
    if (error?.code === 11000) throw new AppError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists");
    throw error;
  }
  return userDto(user.toObject());
}

export async function deactivateUser(targetId: string, actorId: string) {
  return updateUser(targetId, actorId, { isActive: false });
}
