import { createLogger } from "../core/logger";
import { container } from "./container";
import type { InjectionToken, IScopedContainer } from "./types";

const logger = createLogger("DI:Request");

/**
 * Symbol for scoped container in context
 */
export const SCOPED_CONTAINER = Symbol("scopedContainer");

/**
 * DI context added to Elysia handlers
 */
export interface DIContext {
  [SCOPED_CONTAINER]: IScopedContainer;
  resolve: <T>(token: InjectionToken<T>) => T;
  resolveAsync: <T>(token: InjectionToken<T>) => Promise<T>;
}

/**
 * Inject DI container into Elysia context
 *
 * Creates a request-scoped container for each request.
 *
 * @example
 * const router = new Elysia()
 *   .derive(injectContainer())
 *   .get("/", ({ resolve }) => {
 *     const service = resolve(CHAT_SERVICE);
 *     return service.list();
 *   });
 */
export function injectContainer() {
  return async (): Promise<DIContext> => {
    const scope = container.createScope();
    logger.debug(`Scope created: ${scope.scopeId}`);

    return {
      [SCOPED_CONTAINER]: scope,
      resolve: <T>(token: InjectionToken<T>): T => scope.resolve(token),
      resolveAsync: <T>(token: InjectionToken<T>): Promise<T> => scope.resolveAsync(token),
    };
  };
}

/**
 * Cleanup scope after response
 *
 * @example
 * const router = new Elysia()
 *   .derive(injectContainer())
 *   .onAfterResponse(cleanupScope());
 */
export function cleanupScope() {
  return (ctx: Partial<DIContext>): void => {
    const scope = ctx[SCOPED_CONTAINER];
    if (scope) {
      logger.debug(`Scope disposed: ${scope.scopeId}`);
      scope.dispose();
    }
  };
}

/**
 * Pre-resolve specific services into context
 *
 * @example
 * const router = new Elysia()
 *   .derive(injectServices({
 *     chatService: CHAT_SERVICE,
 *     userService: USER_SERVICE,
 *   }))
 *   .get("/", ({ chatService }) => chatService.list());
 */
export function injectServices<T extends Record<string, InjectionToken>>(
  services: T,
): () => { [K in keyof T]: unknown } {
  return () => {
    const result: Record<string, unknown> = {};
    for (const [key, token] of Object.entries(services)) {
      result[key] = container.resolve(token);
    }
    return result as { [K in keyof T]: unknown };
  };
}

/**
 * Create a typed service injector
 *
 * @example
 * const injectChatService = createServiceInjector<IChatService>(CHAT_SERVICE, "chatService");
 * const router = new Elysia().derive(injectChatService());
 */
export function createServiceInjector<T>(token: InjectionToken<T>, propertyName: string) {
  return () => (): Record<string, T> => ({
    [propertyName]: container.resolve(token),
  });
}
