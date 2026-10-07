import bcrypt from "bcrypt";
import { env } from "../config/env.js";
export const hashPassword = (password: string) => bcrypt.hash(password, env.BCRYPT_ROUNDS);
export const comparePassword = (password: string, hash: string) => bcrypt.compare(password, hash);
export const DUMMY_HASH = "$2b$12$1qoX0wGtpW45Mo7V.7uDcehBVCqMr6NOQrHEw9Q2GhPp2H2vZ3Xya";
