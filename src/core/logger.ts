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

interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  [key: string]: unknown;
}

class Logger {
  private context: string;
  private minLevel: number;
  private prettyPrint: boolean;

  constructor(context: string = "App") {
    this.context = context;
    this.minLevel = LOG_LEVELS[appSettings.logging.level as LogLevel] ?? LOG_LEVELS.info;
    // Pretty print with colors in development TTY, structured JSON in production
    this.prettyPrint = !appSettings.isProd && process.stdout.isTTY === true;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.minLevel;
  }

  private buildLogEntry(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>,
  ): StructuredLog {
    return {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...meta,
    };
  }

  private formatPretty(entry: StructuredLog): string {
    const { timestamp, level, context, message, ...meta } = entry;
    const levelColor = COLORS[level];
    const levelStr = level.toUpperCase().padEnd(5);
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";

    return (
      `${COLORS.timestamp}${timestamp}${COLORS.reset} ` +
      `${levelColor}${COLORS.bold}${levelStr}${COLORS.reset} ` +
      `${COLORS.context}[${context}]${COLORS.reset} ` +
      `${message}${COLORS.meta}${metaStr}${COLORS.reset}`
    );
  }

  private formatStructured(entry: StructuredLog): string {
    return JSON.stringify(entry);
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const entry = this.buildLogEntry(level, message, meta);
    const output = this.prettyPrint ? this.formatPretty(entry) : this.formatStructured(entry);

    switch (level) {
      case "debug":
        console.debug(output);
        break;
      case "info":
        console.info(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "error":
        console.error(output);
        break;
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log("debug", message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log("info", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log("warn", message, meta);
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    const errorMeta =
      error instanceof Error
        ? { ...meta, error: { message: error.message, name: error.name, stack: error.stack } }
        : { ...meta, error };
    this.log("error", message, errorMeta);
  }

  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`);
  }
}

export const logger = new Logger();
export const createLogger = (context: string) => new Logger(context);
