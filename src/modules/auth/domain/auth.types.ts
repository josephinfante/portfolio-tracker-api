import { JWTPayload } from "jose";

export interface SignUpInput {
	firstName: string;
	lastName: string;
	email: string;
	password: string;
	baseCurrency?: string;
	timeZone?: string;
}

export interface SignInInput {
	email: string;
	password: string;
}

export interface AuthResponse {
	user: {
		firstName: string;
		lastName: string;
		email: string;
		baseCurrency: string;
		timeZone: string;
	};
	token: string;
}

export interface VerifiedToken {
	payload: JWTPayload & { valid: boolean; reason?: string };
}
