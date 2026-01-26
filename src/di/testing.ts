import { Container } from "./container";
import type { InjectionToken } from "./types";

/**
 * Test container builder for unit tests
 *
 * @example
 * const container = createTestContainer()
 *   .mock(CHAT_REPOSITORY, mockChatRepo)
 *   .mock(USER_REPOSITORY, mockUserRepo)
 *   .build();
 *
 * const service = container.resolve(ChatService);
 */
export class TestContainerBuilder {
  private testContainer = new Container();
  private mocks = new Map<InjectionToken, unknown>();

  /**
   * Mock a token with an implementation
   */
  mock<T>(token: InjectionToken<T>, implementation: T): this {
    this.mocks.set(token, implementation);
    this.testContainer.registerValue(token, implementation);
    return this;
  }

  /**
   * Mock with partial implementation
   */
  mockPartial<T extends object>(token: InjectionToken<T>, partial: Partial<T>): this {
    return this.mock(token, partial as T);
  }

  /**
   * Build the test container
   */
  build(): Container {
    return this.testContainer;
  }

  /**
   * Get a mock for assertions
   */
  getMock<T>(token: InjectionToken<T>): T | undefined {
    return this.mocks.get(token) as T | undefined;
  }
}

/**
 * Create a test container builder
 */
export function createTestContainer(): TestContainerBuilder {
  return new TestContainerBuilder();
}

/**
 * Create mock object with spy functions
 */
export function createMock<T extends object>(methods: (keyof T)[]): T {
  const mock: Record<string, unknown> = {};

  for (const method of methods) {
    let calls: unknown[][] = [];
    let returnValue: unknown;
    let impl: ((...args: unknown[]) => unknown) | null = null;

    const fn = (...args: unknown[]) => {
      calls.push(args);
      return impl ? impl(...args) : returnValue;
    };

    fn.mockReturnValue = (value: unknown) => {
      returnValue = value;
      return fn;
    };

    fn.mockResolvedValue = (value: unknown) => {
      returnValue = Promise.resolve(value);
      return fn;
    };

    fn.mockImplementation = (implementation: (...args: unknown[]) => unknown) => {
      impl = implementation;
      return fn;
    };

    fn.mockClear = () => {
      calls = [];
    };

    Object.defineProperty(fn, "calls", { get: () => calls });

    mock[method as string] = fn;
  }

  return mock as T;
}
