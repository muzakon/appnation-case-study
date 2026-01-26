import { appSettings } from "./settings";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",

  debug: "\x1b[36m", // cyan
  info: "\x1b[32m", // green
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red

  timestamp: "\x1b[90m", // gray
  context: "\x1b[35m", // magenta
  meta: "\x1b[90m", // gray
} as const;

class Logger {
  private context: string;
  private minLevel: number;
  private useColors: boolean;

  constructor(context: string = "App") {
    this.context = context;
    this.minLevel = LOG_LEVELS[appSettings.logging.level as LogLevel] ?? LOG_LEVELS.info;
    this.useColors = !appSettings.isProd && process.stdout.isTTY === true;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.minLevel;
  }

  private formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";

    if (this.useColors) {
      const levelColor = COLORS[level];
      const levelStr = level.toUpperCase().padEnd(5);
      return (
        `${COLORS.timestamp}${timestamp}${COLORS.reset} ` +
        `${levelColor}${COLORS.bold}${levelStr}${COLORS.reset} ` +
        `${COLORS.context}[${this.context}]${COLORS.reset} ` +
        `${message}${COLORS.meta}${metaStr}${COLORS.reset}`
      );
    }

    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}${metaStr}`;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog("debug")) {
      console.debug(this.formatMessage("debug", message, meta));
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog("info")) {
      console.info(this.formatMessage("info", message, meta));
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, meta));
    }
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    if (this.shouldLog("error")) {
      const errorMeta =
        error instanceof Error
          ? { ...meta, errorMessage: error.message, stack: error.stack }
          : { ...meta, error };
      console.error(this.formatMessage("error", message, errorMeta));
    }
  }

  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`);
  }
}

export const logger = new Logger();
export const createLogger = (context: string) => new Logger(context);
