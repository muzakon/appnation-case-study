/**
 * Dependency Injection Module
 *
 * Enterprise-grade DI system with:
 * - Decorator-based injection (@Injectable, @Inject)
 * - Constructor injection
 * - Multiple scopes (Singleton, Request, Transient)
 * - Interface/token-based injection
 * - Elysia framework integration
 */

// Core
export { Container, container } from "./container";
// Decorators
export {
  getScope,
  Inject,
  Injectable,
  isInjectable,
  RequestScoped,
  Singleton,
  Transient,
} from "./decorators";
// Elysia Integration
export {
  cleanupScope,
  createServiceInjector,
  type DIContext,
  injectContainer,
  injectServices,
  SCOPED_CONTAINER,
} from "./elysia";
// Testing
export { createMock, createTestContainer, TestContainerBuilder } from "./testing";

// Tokens
export * from "./tokens";
export type {
  Constructor,
  IContainer,
  InjectableOptions,
  InjectionToken,
  IScopedContainer,
  ServiceMetadata,
} from "./types";
export { Scope } from "./types";
