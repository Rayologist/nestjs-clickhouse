import { Inject } from '@nestjs/common';
import { getConnectionToken } from './clickhouse.utils';

/**
 * Decorator to inject a ClickHouse client connection.
 * @param name - The connection name (optional, defaults to 'default')
 */
export const InjectClickHouse = (name?: string) =>
  Inject(getConnectionToken(name));
