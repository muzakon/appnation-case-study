import { randomUUID } from "node:crypto";
import { createLogger } from "../core/logger";
import {
  type Constructor,
  type IContainer,
  type InjectionToken,
  type IScopedContainer,
  METADATA_KEYS,
  Scope,
  type ServiceMetadata,
} from "./types";

const logger = createLogger("DI");

/**
 * Core Dependency Injection Container
 *
 * Features:
 * - Constructor injection via decorators
 * - Multiple scopes (Singleton, Request, Transient)
 * - Interface/token-based registration
 * - Circular dependency detection
 * - Async factory support
 */
export class Container implements IContainer {
  private registrations = new Map<InjectionToken, ServiceMetadata>();
  private singletons = new Map<InjectionToken, unknown>();
  private resolving = new Set<InjectionToken>();

  /**
   * Register a service with options
   */
  register<T>(token: InjectionToken<T>, options: Partial<ServiceMetadata<T>> = {}): this {
    const metadata: ServiceMetadata<T> = {
      token,
      scope: options.scope ?? Scope.SINGLETON,
      useClass: options.useClass as Constructor<T> | undefined,
      useFactory: options.useFactory,
      useValue: options.useValue,
    };

    this.registrations.set(token, metadata);
    logger.debug(`Registered: ${this.tokenName(token)} [${metadata.scope}]`);
    return this;
  }

  /**
   * Register a class implementation for a token
   */
  registerClass<T>(
    token: InjectionToken<T>,
    implementation: Constructor<T>,
    scope: Scope = Scope.SINGLETON,
  ): this {
    return this.register(token, { useClass: implementation, scope });
  }

  /**
   * Register a factory function
   */
  registerFactory<T>(
    token: InjectionToken<T>,
    factory: (container: IContainer) => T | Promise<T>,
    scope: Scope = Scope.SINGLETON,
  ): this {
    return this.register(token, { useFactory: factory, scope });
  }

  /**
   * Register a constant value
   */
  registerValue<T>(token: InjectionToken<T>, value: T): this {
    return this.register(token, { useValue: value, scope: Scope.SINGLETON });
  }

  /**
   * Check if a token is registered
   */
  has(token: InjectionToken): boolean {
    return this.registrations.has(token);
  }

  /**
   * Resolve a dependency synchronously
   */
  resolve<T>(token: InjectionToken<T>): T {
    return this.resolveInternal(token, null);
  }

  /**
   * Resolve a dependency asynchronously (for async factories)
   */
  async resolveAsync<T>(token: InjectionToken<T>): Promise<T> {
    return this.resolveInternalAsync(token, null);
  }

  /**
   * Create a request-scoped container
   */
  createScope(): IScopedContainer {
    return new ScopedContainer(this);
  }

  /**
   * Get all registered tokens (for debugging)
   */
  getRegisteredTokens(): InjectionToken[] {
    return Array.from(this.registrations.keys());
  }

  /**
   * Clear all registrations (for testing)
   */
  clear(): void {
    this.registrations.clear();
    this.singletons.clear();
    this.resolving.clear();
  }

  /**
   * Get metadata for a token
   */
  getMetadata(token: InjectionToken): ServiceMetadata | undefined {
    return this.registrations.get(token);
  }

  /**
   * Internal sync resolution
   */
  private resolveInternal<T>(
    token: InjectionToken<T>,
    scopedInstances: Map<InjectionToken, unknown> | null,
  ): T {
    // Circular dependency check
    if (this.resolving.has(token)) {
      throw new Error(`Circular dependency detected: ${this.tokenName(token)}`);
    }

    // Check scoped instances first
    if (scopedInstances?.has(token)) {
      return scopedInstances.get(token) as T;
    }

    // Check singletons
    if (this.singletons.has(token)) {
      return this.singletons.get(token) as T;
    }

    const metadata = this.registrations.get(token);
    if (!metadata) {
      throw new Error(`No registration found for: ${this.tokenName(token)}`);
    }

    this.resolving.add(token);

    try {
      let instance: T;

      if (metadata.useValue !== undefined) {
        instance = metadata.useValue as T;
      } else if (metadata.useFactory) {
        const result = metadata.useFactory(this);
        if (result instanceof Promise) {
          throw new Error(`Async factory for ${this.tokenName(token)} - use resolveAsync()`);
        }
        instance = result as T;
      } else if (metadata.useClass) {
        instance = this.instantiate(metadata.useClass, scopedInstances);
      } else if (typeof token === "function") {
        instance = this.instantiate(token as Constructor<T>, scopedInstances);
      } else {
        throw new Error(`Cannot resolve ${this.tokenName(token)}: no implementation`);
      }

      // Cache based on scope
      if (metadata.scope === Scope.SINGLETON) {
        this.singletons.set(token, instance);
      } else if (metadata.scope === Scope.REQUEST && scopedInstances) {
        scopedInstances.set(token, instance);
      }

      return instance;
    } finally {
      this.resolving.delete(token);
    }
  }

  /**
   * Internal async resolution
   */
  private async resolveInternalAsync<T>(
    token: InjectionToken<T>,
    scopedInstances: Map<InjectionToken, unknown> | null,
  ): Promise<T> {
    if (this.resolving.has(token)) {
      throw new Error(`Circular dependency detected: ${this.tokenName(token)}`);
    }

    if (scopedInstances?.has(token)) {
      return scopedInstances.get(token) as T;
    }

    if (this.singletons.has(token)) {
      return this.singletons.get(token) as T;
    }

    const metadata = this.registrations.get(token);
    if (!metadata) {
      throw new Error(`No registration found for: ${this.tokenName(token)}`);
    }

    this.resolving.add(token);

    try {
      let instance: T;

      if (metadata.useValue !== undefined) {
        instance = metadata.useValue as T;
      } else if (metadata.useFactory) {
        const result = metadata.useFactory(this);
        instance = (result instanceof Promise ? await result : result) as T;
      } else if (metadata.useClass) {
        instance = await this.instantiateAsync(metadata.useClass, scopedInstances);
      } else if (typeof token === "function") {
        instance = await this.instantiateAsync(token as Constructor<T>, scopedInstances);
      } else {
        throw new Error(`Cannot resolve ${this.tokenName(token)}: no implementation`);
      }

      if (metadata.scope === Scope.SINGLETON) {
        this.singletons.set(token, instance);
      } else if (metadata.scope === Scope.REQUEST && scopedInstances) {
        scopedInstances.set(token, instance);
      }

      return instance;
    } finally {
      this.resolving.delete(token);
    }
  }

  /**
   * Instantiate a class with dependencies
   */
  private instantiate<T>(
    Target: Constructor<T>,
    scopedInstances: Map<InjectionToken, unknown> | null,
  ): T {
    const paramTypes = this.getParamTypes(Target);
    const injectedParams = this.getInjectedParams(Target);

    const deps = paramTypes.map((type, index) => {
      const overrideToken = injectedParams.get(index);
      const token = overrideToken ?? type;

      if (!token || token === Object) {
        throw new Error(`Cannot resolve param ${index} of ${Target.name}: no type. Use @Inject()`);
      }

      return this.resolveInternal(token, scopedInstances);
    });

    return new Target(...deps);
  }

  /**
   * Async instantiation
   */
  private async instantiateAsync<T>(
    Target: Constructor<T>,
    scopedInstances: Map<InjectionToken, unknown> | null,
  ): Promise<T> {
    const paramTypes = this.getParamTypes(Target);
    const injectedParams = this.getInjectedParams(Target);

    const deps = await Promise.all(
      paramTypes.map(async (type, index) => {
        const overrideToken = injectedParams.get(index);
        const token = overrideToken ?? type;

        if (!token || token === Object) {
          throw new Error(
            `Cannot resolve param ${index} of ${Target.name}: no type. Use @Inject()`,
          );
        }

        return this.resolveInternalAsync(token, scopedInstances);
      }),
    );

    return new Target(...deps);
  }

  /**
   * Get constructor parameter types via reflect-metadata
   */
  private getParamTypes(Target: Constructor): Constructor[] {
    return Reflect.getMetadata(METADATA_KEYS.PARAM_TYPES, Target) || [];
  }

  /**
   * Get @Inject() overrides
   */
  private getInjectedParams(Target: Constructor): Map<number, InjectionToken> {
    return Reflect.getMetadata(METADATA_KEYS.INJECT, Target) || new Map();
  }

  /**
   * Get human-readable token name
   */
  private tokenName(token: InjectionToken): string {
    if (typeof token === "symbol") {
      return token.description || token.toString();
    }
    if (typeof token === "function") {
      return token.name;
    }
    return String(token);
  }

  // Methods for scoped resolution
  resolveScoped<T>(token: InjectionToken<T>, scopedInstances: Map<InjectionToken, unknown>): T {
    return this.resolveInternal(token, scopedInstances);
  }

  async resolveScopedAsync<T>(
    token: InjectionToken<T>,
    scopedInstances: Map<InjectionToken, unknown>,
  ): Promise<T> {
    return this.resolveInternalAsync(token, scopedInstances);
  }
}

/**
 * Request-scoped container
 */
class ScopedContainer implements IScopedContainer {
  readonly scopeId: string;
  private instances = new Map<InjectionToken, unknown>();
  private disposed = false;

  constructor(private parent: Container) {
    this.scopeId = randomUUID();
  }

  resolve<T>(token: InjectionToken<T>): T {
    this.checkDisposed();
    return this.parent.resolveScoped(token, this.instances);
  }

  async resolveAsync<T>(token: InjectionToken<T>): Promise<T> {
    this.checkDisposed();
    return this.parent.resolveScopedAsync(token, this.instances);
  }

  has(token: InjectionToken): boolean {
    return this.parent.has(token);
  }

  createScope(): IScopedContainer {
    return this;
  }

  dispose(): void {
    for (const instance of this.instances.values()) {
      if (instance && typeof (instance as { dispose?: () => void }).dispose === "function") {
        (instance as { dispose: () => void }).dispose();
      }
    }
    this.instances.clear();
    this.disposed = true;
  }

  private checkDisposed(): void {
    if (this.disposed) {
      throw new Error("Cannot use disposed scope");
    }
  }
}

// Global container instance
export const container = new Container();
