import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import { authOptions } from "./options";

export const webAuth = betterAuth({ ...authOptions, plugins: [nextCookies()] });
