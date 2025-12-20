import type { FactoryProvider, ModuleMetadata, Type } from '@nestjs/common';
import type { ClickHouseClientConfigOptions } from '@clickhouse/client';

export interface ClickHouseModuleOptions extends ClickHouseClientConfigOptions {
  /**
   * Connection name for multiple connections support.
   * @default 'DefaultClickHouseConnection'
   */
  name?: string;

  /**
   * Number of retry attempts when connecting to ClickHouse.
   * @default 10
   */
  retryAttempts?: number;

  /**
   * Delay between retry attempts in milliseconds.
   * @default 3000
   */
  retryDelay?: number;

  /**
   * If true, will show verbose error messages on retry.
   * @default false
   */
  verboseRetryLog?: boolean;
}

export interface ClickHouseOptionsFactory {
  createClickHouseOptions():
    | Promise<ClickHouseModuleOptions>
    | ClickHouseModuleOptions;
}

export interface ClickHouseModuleAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  /**
   * Connection name for multiple connections support.
   * @default 'DefaultClickHouseConnection' (if undefined or not provided)
   */
  name?: string;

  /**
   * Existing provider to be used.
   */
  useExisting?: Type<ClickHouseOptionsFactory>;

  /**
   * Type (class name) of provider to be instantiated.
   */
  useClass?: Type<ClickHouseOptionsFactory>;

  /**
   * Factory function that returns an instance of the provider to be injected.
   */
  useFactory?: (
    ...args: any[]
  ) => Promise<ClickHouseModuleOptions> | ClickHouseModuleOptions;

  /**
   * Optional list of providers to be injected into the context of the Factory function.
   */
  inject?: FactoryProvider['inject'];
}
