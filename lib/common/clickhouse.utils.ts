import { Logger } from '@nestjs/common';
import { Observable, timer } from 'rxjs';
import { retry } from 'rxjs/operators';
import { DEFAULT_CONNECTION_NAME } from '../clickhouse.constants';

const logger = new Logger('ClickHouseModule');

/**
 * Returns the connection token for the given connection name.
 * @param name - The connection name (optional, defaults to 'DefaultClickHouseConnection')
 * @returns The connection token string
 */
export function getConnectionToken(name?: string): string {
  if (name === undefined || name === DEFAULT_CONNECTION_NAME) {
    return DEFAULT_CONNECTION_NAME;
  }

  return `${name}ClickHouseConnection`;
}

export interface HandleRetryOptions {
  connectionName?: string;
  retryAttempts?: number;
  retryDelay?: number;
  verboseRetryLog?: boolean;
}

export function handleRetry(options: HandleRetryOptions = {}) {
  const {
    connectionName = DEFAULT_CONNECTION_NAME,
    retryAttempts = 10,
    retryDelay = 3000,
    verboseRetryLog = false,
  } = options;

  return <T>(source: Observable<T>): Observable<T> =>
    source.pipe(
      retry({
        count: retryAttempts,
        delay: (error: Error, errorCount) => {
          const connectionInfo =
            connectionName === DEFAULT_CONNECTION_NAME
              ? ''
              : ` (${connectionName})`;
          const verboseMessage = verboseRetryLog
            ? ` Message: ${error.message}.`
            : '';

          logger.error(
            `Unable to connect to ClickHouse${connectionInfo}.${verboseMessage} Retrying (${errorCount})...`,
            error.stack,
          );

          return timer(retryDelay);
        },
      }),
    );
}
