import { UserEntity } from "@modules/users/domain/user.entity";
import { AuthResponse } from "../domain/auth.types";

export class AuthMapper {
	static toSafeUserWithToken(user: UserEntity, token: string): AuthResponse {
		return {
			user: {
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				baseCurrency: user.baseCurrency,
				timeZone: user.timeZone,
			},
			token,
		};
	}
}
