export interface Logger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

class ConsoleLogger implements Logger {
  private formatMessage(
    level: string,
    message: string,
    meta?: unknown
  ): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  debug(message: string, meta?: unknown): void {
    process.stderr.write(this.formatMessage('debug', message, meta) + '\n');
  }

  info(message: string, meta?: unknown): void {
    process.stderr.write(this.formatMessage('info', message, meta) + '\n');
  }

  warn(message: string, meta?: unknown): void {
    process.stderr.write(this.formatMessage('warn', message, meta) + '\n');
  }

  error(message: string, meta?: unknown): void {
    process.stderr.write(this.formatMessage('error', message, meta) + '\n');
  }
}

export const logger = new ConsoleLogger();
