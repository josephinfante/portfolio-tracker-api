export function applyPatch<T extends object>(current: T, input: Partial<T>, allowed: readonly (keyof T)[]): Partial<T> {
	const patch: Partial<T> = {};

	for (const key of allowed) {
		if (input[key] !== undefined && input[key] !== current[key]) {
			patch[key] = input[key];
		}
	}

	return patch;
}
