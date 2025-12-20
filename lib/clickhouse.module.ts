import { DynamicModule, Module } from '@nestjs/common';
import { ClickHouseCoreModule } from './clickhouse-core.module';
import type {
  ClickHouseModuleAsyncOptions,
  ClickHouseModuleOptions,
} from './interfaces';

@Module({})
export class ClickHouseModule {
  /**
   * Register ClickHouse module with synchronous options.
   * @param options ClickHouse module options
   * @returns DynamicModule
   */
  static forRoot(options: ClickHouseModuleOptions = {}): DynamicModule {
    return {
      module: ClickHouseModule,
      imports: [ClickHouseCoreModule.forRoot(options)],
    };
  }

  /**
   * Register ClickHouse module with asynchronous options.
   * @param options ClickHouse module async options
   * @returns DynamicModule
   */
  static forRootAsync(options: ClickHouseModuleAsyncOptions): DynamicModule {
    return {
      module: ClickHouseModule,
      imports: [ClickHouseCoreModule.forRootAsync(options)],
    };
  }
}
