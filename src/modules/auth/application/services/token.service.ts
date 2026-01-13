import { VerifiedToken } from "@modules/auth/domain/auth.types";
import { JWTPayload } from "jose";

export interface TokenService {
	sign(payload: JWTPayload, duration?: string): Promise<string>;
	verify(token: string): Promise<VerifiedToken | null>;
	invalidate(token: string): Promise<boolean>;
}
