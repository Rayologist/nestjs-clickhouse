import {
  DynamicModule,
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationShutdown,
  type Provider,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { defer, lastValueFrom } from 'rxjs';
import {
  createClient,
  type ClickHouseClient,
  type ClickHouseClientConfigOptions,
} from '@clickhouse/client';
import {
  CLICKHOUSE_CONNECTION_NAME,
  CLICKHOUSE_MODULE_OPTIONS,
} from './clickhouse.constants';
import {
  getConnectionToken,
  handleRetry,
  type HandleRetryOptions,
} from './common/clickhouse.utils';
import type {
  ClickHouseModuleAsyncOptions,
  ClickHouseModuleOptions,
  ClickHouseOptionsFactory,
} from './interfaces';

@Global()
@Module({})
export class ClickHouseCoreModule implements OnApplicationShutdown {
  private readonly logger = new Logger('ClickHouseModule');

  constructor(
    @Inject(CLICKHOUSE_CONNECTION_NAME)
    private readonly connectionName: string,
    private readonly moduleRef: ModuleRef,
  ) {}

  /**
   * Register ClickHouse module with synchronous options.
   * @param options ClickHouse module options
   * @returns DynamicModule
   */
  static forRoot(options: ClickHouseModuleOptions): DynamicModule {
    const {
      name,
      retryAttempts,
      retryDelay,
      verboseRetryLog,
      ...clientOptions
    } = options;

    const connectionName = getConnectionToken(name);

    const connectionNameProvider: Provider = {
      provide: CLICKHOUSE_CONNECTION_NAME,
      useValue: connectionName,
    };

    const connectionProvider: Provider = {
      provide: connectionName,
      useFactory: () =>
        this.createClickHouseClient(clientOptions, {
          connectionName,
          retryAttempts,
          retryDelay,
          verboseRetryLog,
        }),
    };

    return {
      module: ClickHouseCoreModule,
      providers: [connectionProvider, connectionNameProvider],
      exports: [connectionProvider],
    };
  }

  /**
   * Register ClickHouse module with asynchronous options.
   * @param options ClickHouse module async options
   * @returns DynamicModule
   */
  static forRootAsync(options: ClickHouseModuleAsyncOptions): DynamicModule {
    const connectionName = getConnectionToken(options.name);

    const connectionNameProvider: Provider = {
      provide: CLICKHOUSE_CONNECTION_NAME,
      useValue: connectionName,
    };

    const connectionProvider: Provider = {
      provide: connectionName,
      useFactory: (moduleOptions: ClickHouseModuleOptions) => {
        const { retryAttempts, retryDelay, verboseRetryLog, ...clientOptions } =
          moduleOptions;

        return this.createClickHouseClient(clientOptions, {
          connectionName,
          retryAttempts,
          retryDelay,
          verboseRetryLog,
        });
      },
      inject: [CLICKHOUSE_MODULE_OPTIONS],
    };

    return {
      module: ClickHouseCoreModule,
      imports: options.imports || [],
      providers: [
        ...this.createAsyncProviders(options),
        connectionProvider,
        connectionNameProvider,
      ],
      exports: [connectionProvider],
    };
  }

  private static createClickHouseClient(
    clientOptions: ClickHouseClientConfigOptions,
    retryOptions: HandleRetryOptions,
  ): Promise<ClickHouseClient> {
    const client = createClient(clientOptions);
    return lastValueFrom(
      defer(async () => {
        const result = await client.ping();
        if (!result.success) {
          throw new Error(result.error?.message);
        }

        return client;
      }).pipe(handleRetry(retryOptions)),
    );
  }

  private static createAsyncProviders(
    options: ClickHouseModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass!,
        useClass: options.useClass!,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: ClickHouseModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: CLICKHOUSE_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    return {
      provide: CLICKHOUSE_MODULE_OPTIONS,
      useFactory: (factory: ClickHouseOptionsFactory) =>
        factory.createClickHouseOptions(),
      inject: [options.useExisting || options.useClass!],
    };
  }

  async onApplicationShutdown(): Promise<void> {
    const client = this.moduleRef.get<ClickHouseClient>(this.connectionName, {
      strict: false,
    });

    if (client) {
      this.logger.log(`Closing ClickHouse connection (${this.connectionName})`);
      await client.close();
    }
  }
}
