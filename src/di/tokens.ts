/**
 * Injection Tokens
 *
 * Using symbols ensures uniqueness and enables interface-based injection.
 * Each token represents a contract that can have different implementations.
 */

// Repository Tokens
export const CHAT_REPOSITORY = Symbol.for("IChatRepository");
export const MESSAGE_REPOSITORY = Symbol.for("IMessageRepository");
export const USER_REPOSITORY = Symbol.for("IUserRepository");

// Service Tokens
export const CHAT_SERVICE = Symbol.for("IChatService");

// Infrastructure Tokens
export const DATABASE_CLIENT = Symbol.for("IDatabaseClient");
export const REDIS_CLIENT = Symbol.for("IRedisClient");
export const LOGGER = Symbol.for("ILogger");

/**
 * Helper to create typed tokens
 */
export function createToken<T>(description: string): symbol {
  return Symbol.for(description);
}
