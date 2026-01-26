import { createLogger } from "./logger";

const logger = createLogger("Lifecycle");

type LifecycleHook = () => Promise<void> | void;

export interface LifespanResource {
  name: string;
  onStart?: LifecycleHook;
  onStop?: LifecycleHook;
  priority?: number;
}

export function defineService<T>(config: {
  name: string;
  priority?: number;
  connect: () => Promise<T>;
  disconnect: (client: T) => Promise<void>;
}): { register: () => void; get: () => T } {
  let instance: T | null = null;

  const resource: LifespanResource = {
    name: config.name,
    priority: config.priority ?? 0,
    onStart: async () => {
      instance = await config.connect();
    },
    onStop: async () => {
      if (instance) {
        await config.disconnect(instance);
        instance = null;
      }
    },
  };

  return {
    register: () => lifespan.register(resource),
    get: () => {
      if (!instance) {
        throw new Error(`${config.name} not initialized. Call lifespan.start() first.`);
      }
      return instance;
    },
  };
}

class LifespanManager {
  private resources: LifespanResource[] = [];
  private isStarted = false;
  private isStopping = false;

  register(resource: LifespanResource): void {
    this.resources.push({
      ...resource,
      priority: resource.priority ?? 0,
    });
    logger.debug(`Registered lifecycle resource: ${resource.name}`);
  }

  async start(): Promise<void> {
    if (this.isStarted) {
      logger.warn("Lifecycle already started");
      return;
    }

    logger.info("Starting application lifespan...");

    const sortedResources = [...this.resources].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
    );

    for (const resource of sortedResources) {
      if (resource.onStart) {
        try {
          logger.info(`Starting: ${resource.name}`);
          await resource.onStart();
          logger.info(`Started: ${resource.name}`);
        } catch (error) {
          logger.error(`Failed to start: ${resource.name}`, error);
          throw error;
        }
      }
    }

    this.isStarted = true;
    logger.info("Application lifecycle started successfully");
  }

  async stop(): Promise<void> {
    if (!this.isStarted || this.isStopping) {
      return;
    }

    this.isStopping = true;
    logger.info("Stopping application lifespan...");

    const sortedResources = [...this.resources].sort(
      (a, b) => (a.priority ?? 0) - (b.priority ?? 0),
    );

    const errors: Error[] = [];

    for (const resource of sortedResources) {
      if (resource.onStop) {
        try {
          logger.info(`Stopping: ${resource.name}`);
          await resource.onStop();
          logger.info(`Stopped: ${resource.name}`);
        } catch (error) {
          logger.error(`Failed to stop: ${resource.name}`, error);
          errors.push(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }

    this.isStarted = false;
    this.isStopping = false;

    if (errors.length > 0) {
      logger.error(`Lifecycle stopped with ${errors.length} error(s)`);
    } else {
      logger.info("Application lifecycle stopped successfully");
    }
  }

  isRunning(): boolean {
    return this.isStarted && !this.isStopping;
  }
}

export const lifespan = new LifespanManager();
