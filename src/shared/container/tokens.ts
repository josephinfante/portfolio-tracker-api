export const TOKENS = {
	UserRepository: Symbol.for("UserRepository"),
	PlatformRepository: Symbol.for("PlatformRepository"),
	AccountRepository: Symbol.for("AccountRepository"),
	AssetRepository: Symbol.for("AssetRepository"),
	TransactionRepository: Symbol.for("TransactionRepository"),
	ExchangeRateRepository: Symbol.for("ExchangeRateRepository"),

	CacheService: Symbol.for("CacheService"),
	RedisClient: Symbol.for("RedisClient"),
	Drizzle: Symbol.for("Drizzle"),
	Logger: Symbol.for("Logger"),

	PasswordHasher: Symbol.for("PasswordHasher"),
	TokenService: Symbol.for("TokenService"),
};
