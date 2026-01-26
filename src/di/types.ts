/**
 * Dependency Injection Type Definitions
 */

/**
 * Injection scopes
 */
export enum Scope {
  /** Single instance for entire application lifetime */
  SINGLETON = "SINGLETON",
  /** New instance per HTTP request */
  REQUEST = "REQUEST",
  /** New instance every time resolved */
  TRANSIENT = "TRANSIENT",
}

/**
 * Constructor type for class instantiation
 */
export type Constructor<T = unknown> = new (...args: any[]) => T;

/**
 * Injection token - can be a class constructor, symbol, or string
 */
export type InjectionToken<T = unknown> = Constructor<T> | symbol | string;

/**
 * Service registration metadata
 */
export interface ServiceMetadata<T = unknown> {
  token: InjectionToken<T>;
  scope: Scope;
  useClass?: Constructor<T>;
  useFactory?: (container: IContainer) => T | Promise<T>;
  useValue?: T;
}

/**
 * Container interface for type-safe resolution
 */
export interface IContainer {
  resolve<T>(token: InjectionToken<T>): T;
  resolveAsync<T>(token: InjectionToken<T>): Promise<T>;
  has(token: InjectionToken): boolean;
  createScope(): IScopedContainer;
}

/**
 * Scoped container for request-level dependencies
 */
export interface IScopedContainer extends IContainer {
  readonly scopeId: string;
  dispose(): void;
}

/**
 * Decorator metadata keys
 */
export const METADATA_KEYS = {
  INJECTABLE: Symbol("di:injectable"),
  INJECT: Symbol("di:inject"),
  PARAM_TYPES: "design:paramtypes",
  SCOPE: Symbol("di:scope"),
} as const;

/**
 * Injectable decorator options
 */
export interface InjectableOptions {
  scope?: Scope;
  token?: InjectionToken;
}
