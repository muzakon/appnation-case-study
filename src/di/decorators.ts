import "reflect-metadata";
import { container } from "./container";
import {
  type Constructor,
  type InjectableOptions,
  type InjectionToken,
  METADATA_KEYS,
  Scope,
} from "./types";

/**
 * @Injectable() decorator
 *
 * Marks a class as injectable and registers it with the container.
 *
 * @example
 * // Auto-register as singleton
 * @Injectable()
 * class MyService {}
 *
 * // Request-scoped
 * @Injectable({ scope: Scope.REQUEST })
 * class RequestService {}
 *
 * // With interface token
 * @Injectable({ token: MY_SERVICE_TOKEN })
 * class MyServiceImpl implements IMyService {}
 */
export function Injectable(options: InjectableOptions = {}): ClassDecorator {
  return <T extends Function>(target: T): T => {
    Reflect.defineMetadata(METADATA_KEYS.INJECTABLE, true, target);
    Reflect.defineMetadata(METADATA_KEYS.SCOPE, options.scope ?? Scope.SINGLETON, target);

    const token = options.token ?? target;
    const scope = options.scope ?? Scope.SINGLETON;

    container.register(token, {
      useClass: target as unknown as Constructor,
      scope,
    });

    // Also register by class if using custom token
    if (options.token && options.token !== target) {
      container.register(target, {
        useClass: target as unknown as Constructor,
        scope,
      });
    }

    return target;
  };
}

/**
 * @Inject() decorator for constructor parameters
 *
 * Overrides the auto-detected type with a specific token.
 * Required for interface-based injection.
 *
 * @example
 * @Injectable()
 * class ChatService {
 *   constructor(
 *     @Inject(CHAT_REPOSITORY) private chatRepo: IChatRepository,
 *   ) {}
 * }
 */
export function Inject(token: InjectionToken): ParameterDecorator {
  return (
    target: Object,
    _propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ): void => {
    const existingInjections: Map<number, InjectionToken> =
      Reflect.getMetadata(METADATA_KEYS.INJECT, target) || new Map();

    existingInjections.set(parameterIndex, token);
    Reflect.defineMetadata(METADATA_KEYS.INJECT, existingInjections, target);
  };
}

/**
 * @Singleton() - Shorthand for @Injectable({ scope: Scope.SINGLETON })
 */
export function Singleton(): ClassDecorator {
  return Injectable({ scope: Scope.SINGLETON });
}

/**
 * @RequestScoped() - Shorthand for @Injectable({ scope: Scope.REQUEST })
 */
export function RequestScoped(): ClassDecorator {
  return Injectable({ scope: Scope.REQUEST });
}

/**
 * @Transient() - Shorthand for @Injectable({ scope: Scope.TRANSIENT })
 */
export function Transient(): ClassDecorator {
  return Injectable({ scope: Scope.TRANSIENT });
}

/**
 * Check if a class is injectable
 */
export function isInjectable(target: Constructor): boolean {
  return Reflect.getMetadata(METADATA_KEYS.INJECTABLE, target) === true;
}

/**
 * Get the scope of an injectable class
 */
export function getScope(target: Constructor): Scope {
  return Reflect.getMetadata(METADATA_KEYS.SCOPE, target) ?? Scope.SINGLETON;
}
