import { TokenService } from "@modules/auth/application/services/token.service";
import { VerifiedToken } from "@modules/auth/domain/auth.types";
import { environment } from "@shared/config/environment";
import { TOKENS } from "@shared/container/tokens";
import { RedisClient } from "@shared/redis/redis.client";
import { JWTHeaderParameters, JWTPayload, SignJWT, jwtVerify } from "jose";
import { inject, injectable } from "tsyringe";
import { v4 as uuidv4 } from "uuid";

@injectable()
export class JwtTokenService implements TokenService {
	private readonly secret: Uint8Array;

	constructor(
		@inject(TOKENS.RedisClient)
		private readonly redis: RedisClient,
	) {
		this.secret = new TextEncoder().encode(environment.JWT_SECRET);
	}

	async sign(payload: JWTPayload, duration = "6h"): Promise<string> {
		return new SignJWT({ ...payload, jti: uuidv4() })
			.setProtectedHeader({ alg: "HS256" })
			.setIssuedAt()
			.setExpirationTime(duration)
			.sign(this.secret);
	}

	async verify(token: string): Promise<VerifiedToken | null> {
		try {
			const { payload, protectedHeader } = await jwtVerify(token, this.secret);

			if (payload.type) {
				return this.validateOneTimeToken(payload, protectedHeader);
			}

			return this.validateAuthToken(payload, protectedHeader);
		} catch {
			return null;
		}
	}

	async invalidate(token: string): Promise<boolean> {
		const verified = await this.verify(token);
		if (!verified?.payload?.jti) return false;

		const ttl = verified.payload.exp ? verified.payload.exp - Math.floor(Date.now() / 1000) : 3600;

		await this.redis.setex(`blacklist:token:${verified.payload.jti}`, ttl, "blacklisted");
		return true;
	}

	private async validateOneTimeToken(payload: JWTPayload, protectedHeader: JWTHeaderParameters) {
		const key = `one-time:token:${payload.jti}`;

		if (await this.redis.exists(key)) {
			return {
				payload: { ...payload, valid: false, reason: "One-time token already used" },
				protectedHeader,
			};
		}

		const ttl = payload.exp ? payload.exp - Math.floor(Date.now() / 1000) : 3600;
		await this.redis.setex(key, ttl, "used");

		return { payload: { ...payload, valid: true }, protectedHeader };
	}

	private async validateAuthToken(payload: JWTPayload, protectedHeader: JWTHeaderParameters) {
		const blacklisted = await this.redis.exists(`blacklist:token:${payload.jti}`);

		if (blacklisted) {
			return {
				payload: { ...payload, valid: false, reason: "Token invalidated" },
				protectedHeader,
			};
		}

		return { payload: { ...payload, valid: true }, protectedHeader };
	}
}
