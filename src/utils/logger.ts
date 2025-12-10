/**
 * Simple logging utility for Dooray MCP Server
 */

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

class Logger {
  private level: LogLevel = LogLevel.INFO;

  setLevel(level: LogLevel) {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    return levels.indexOf(level) <= levels.indexOf(this.level);
  }

  private log(level: LogLevel, message: string, ...args: unknown[]) {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;

    // Log to stderr to avoid interfering with MCP stdio communication
    console.error(prefix, message, ...args);
  }

  error(message: string, ...args: unknown[]) {
    this.log(LogLevel.ERROR, message, ...args);
  }

  warn(message: string, ...args: unknown[]) {
    this.log(LogLevel.WARN, message, ...args);
  }

  info(message: string, ...args: unknown[]) {
    this.log(LogLevel.INFO, message, ...args);
  }

  debug(message: string, ...args: unknown[]) {
    this.log(LogLevel.DEBUG, message, ...args);
  }
}

export const logger = new Logger();

// Set log level from environment variable
const logLevel = process.env.LOG_LEVEL?.toUpperCase() as LogLevel;
if (logLevel && Object.values(LogLevel).includes(logLevel)) {
  logger.setLevel(logLevel);
}
