import type { User, Chat } from "./index.ts";

export type SearchUsersResult = {
    user: User;
    chat?: Chat;
}