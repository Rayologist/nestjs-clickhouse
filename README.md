# NestJS ClickHouse Module

A NestJS module for integrating [ClickHouse](https://clickhouse.com/) database using the official [@clickhouse/client](https://github.com/ClickHouse/clickhouse-js).

This module follows the same patterns as official NestJS modules (e.g., `@nestjs/mongoose`, `@nestjs/typeorm`), providing a consistent client API with multi-connection support.

## Installation

1. Copy the `lib/` folder into your project and rename it to `clickhouse`
2. Install the ClickHouse client:

```bash
npm install @clickhouse/client
# or
pnpm install @clickhouse/client
# or
yarn add @clickhouse/client
```

## Usage

### Basic Registration

```typescript
import { Module } from '@nestjs/common';
import { ClickHouseModule } from 'your-clickhouse-module';

@Module({
  imports: [
    ClickHouseModule.forRoot({
      url: 'http://localhost:8123',
      username: 'default',
      password: '',
      database: 'default',
    }),
  ],
})
export class AppModule {}
```

### Async Registration

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClickHouseModule } from 'your-clickhouse-module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ClickHouseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        url: configService.get('CLICKHOUSE_URL'),
        username: configService.get('CLICKHOUSE_USERNAME'),
        password: configService.get('CLICKHOUSE_PASSWORD'),
        database: configService.get('CLICKHOUSE_DATABASE'),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### Using a Factory Class

```typescript
import { Injectable, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  ClickHouseModule,
  ClickHouseOptionsFactory,
  ClickHouseModuleOptions,
} from 'your-clickhouse-module';

@Injectable()
export class ClickHouseConfigService implements ClickHouseOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createClickHouseOptions(): ClickHouseModuleOptions {
    return {
      url: this.configService.get('CLICKHOUSE_URL'),
      username: this.configService.get('CLICKHOUSE_USERNAME'),
      password: this.configService.get('CLICKHOUSE_PASSWORD'),
      database: this.configService.get('CLICKHOUSE_DATABASE'),
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot(),
    ClickHouseModule.forRootAsync({
      imports: [ConfigModule],
      useClass: ClickHouseConfigService,
    }),
  ],
})
export class AppModule {}
```

### Multiple Connections

```typescript
import { Module } from '@nestjs/common';
import { ClickHouseModule } from 'your-clickhouse-module';

@Module({
  imports: [
    // Default connection
    ClickHouseModule.forRoot({
      url: 'http://localhost:8123',
      database: 'analytics',
    }),
    // Named connection
    ClickHouseModule.forRoot({
      name: 'logs',
      url: 'http://localhost:8124',
      database: 'logs',
    }),
  ],
})
export class AppModule {}
```

## Injection

### Using @InjectClickHouse Decorator

```typescript
import { Injectable } from '@nestjs/common';
import type { ClickHouseClient } from '@clickhouse/client';
import { InjectClickHouse } from 'your-clickhouse-module';

@Injectable()
export class UserService {
  constructor(
    @InjectClickHouse() private readonly client: ClickHouseClient,
  ) {}

  async getUsers() {
    const result = await this.client.query({
      query: 'SELECT * FROM users',
      format: 'JSONEachRow',
    });
    return result.json();
  }

  async insertUser(user: { id: string; name: string }) {
    await this.client.insert({
      table: 'users',
      values: [user],
      format: 'JSONEachRow',
    });
  }
}
```

### Injecting Named Connections

```typescript
import { Injectable } from '@nestjs/common';
import type { ClickHouseClient } from '@clickhouse/client';
import { InjectClickHouse } from 'your-clickhouse-module';

@Injectable()
export class LogService {
  constructor(
    @InjectClickHouse('logs') private readonly logsClient: ClickHouseClient,
  ) {}

  async getLogs() {
    const result = await this.logsClient.query({
      query: 'SELECT * FROM application_logs',
      format: 'JSONEachRow',
    });
    return result.json();
  }
}
```

### Using getConnectionToken

```typescript
import { Inject, Injectable } from '@nestjs/common';
import type { ClickHouseClient } from '@clickhouse/client';
import { getConnectionToken } from 'your-clickhouse-module';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(getConnectionToken()) private readonly client: ClickHouseClient,
    @Inject(getConnectionToken('logs')) private readonly logsClient: ClickHouseClient,
  ) {}
}
```

## Module Structure

```text
lib/
├── index.ts                              # Re-exports
├── clickhouse.module.ts                  # Facade (forRoot, forRootAsync)
├── clickhouse-core.module.ts             # @Global, connection lifecycle
├── clickhouse.constants.ts               # Injection tokens
├── common/
│   ├── index.ts
│   ├── clickhouse.decorators.ts          # @InjectClickHouse
│   └── clickhouse.utils.ts               # getConnectionToken, handleRetry
└── interfaces/
    ├── index.ts
    └── clickhouse-module-options.interface.ts
```

## API Reference

### ClickHouseModule

- `forRoot(options?: ClickHouseModuleOptions)` - Register the module with synchronous options
- `forRootAsync(options: ClickHouseModuleAsyncOptions)` - Register the module with asynchronous options

### ClickHouseModuleOptions

Extends `ClickHouseClientConfigOptions` from `@clickhouse/client` with:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | `string` | `'DefaultClickHouseConnection'` | Connection name for multiple connections |
| `retryAttempts` | `number` | `10` | Number of retry attempts when connecting |
| `retryDelay` | `number` | `3000` | Delay between retries in milliseconds |
| `verboseRetryLog` | `boolean` | `false` | Show verbose error messages on retry |

### ClickHouseModuleAsyncOptions

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Connection name for multiple connections |
| `imports` | `ModuleMetadata['imports']` | Optional list of imported modules |
| `useExisting` | `Type<ClickHouseOptionsFactory>` | Existing provider to be used |
| `useClass` | `Type<ClickHouseOptionsFactory>` | Type (class name) of provider to be instantiated |
| `useFactory` | `(...args: any[]) => ClickHouseModuleOptions` | Factory function that returns options |
| `inject` | `FactoryProvider['inject']` | Optional list of providers to be injected into the factory function |
| `extraProviders` | `Provider[]` | Optional list of extra providers to be registered |

### ClickHouseOptionsFactory

Interface for creating ClickHouse options using a factory class:

```typescript
interface ClickHouseOptionsFactory {
  createClickHouseOptions(): Promise<ClickHouseModuleOptions> | ClickHouseModuleOptions;
}
```

### Decorators

- `@InjectClickHouse(name?: string)` - Injects a ClickHouse client connection

### Utilities

- `getConnectionToken(name?: string)` - Returns the connection token for dependency injection

## Features

- **Global Module** - CoreModule is automatically global, no need to import in every module
- **Multiple Connections** - Support for named connections
- **Retry Logic** - Built-in connection retry with configurable attempts and delay
- **Graceful Shutdown** - Automatically closes connections on application shutdown
- **Type Safety** - Full TypeScript support with proper type exports
- **Connection Verification** - Pings ClickHouse on startup to verify connection

---

## Contact

If you have any questions or suggestions, please feel free to contact me at bwchen.dev@gmail.com.