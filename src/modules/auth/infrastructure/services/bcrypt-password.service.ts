import { PasswordHasher } from "@modules/auth/application/services/password-hasher.service";
import bcrypt from "bcryptjs";
import { injectable } from "tsyringe";

@injectable()
export class BcryptPasswordService implements PasswordHasher {
	async hash(value: string): Promise<string> {
		const salt = bcrypt.genSaltSync(12);
		return bcrypt.hash(value, salt);
	}

	async compare(value: string, hashedValue: string): Promise<boolean> {
		return bcrypt.compare(value, hashedValue);
	}
}
