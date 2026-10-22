import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC = "isPublic";

/** A route open to anyone, without signing in (SessionGuard lets it through). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
