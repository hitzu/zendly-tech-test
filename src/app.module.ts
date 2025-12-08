import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getTypeOrmConfig } from './config/database';
import { LoggerModule } from 'nestjs-pino';
import { getLoggerConfigs } from './config/logger/logger.config';
import { AuthModule } from './auth/auth.module';
import { OperatorsModule } from './operators/operators.module';
import { DevTokenGuard } from './auth/guards/dev-token.guard';
import { TokenModule } from './tokens/token.module';
import { InboxesModule } from './inboxes/inboxes.module';
import { OperatorInboxSubscriptionsModule } from './operator-inbox-subscriptions/operator-inbox-subscriptions.module';
import { TenantsModule } from './tenants/tenants.module';
import { ConversationsModule } from './conversations/conversations.module';
import { AllocationModule } from './allocation/allocation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'local'}`,
        '.env.test',
        '.env',
      ],
    }),
    LoggerModule.forRoot(getLoggerConfigs()),
    TypeOrmModule.forRootAsync({
      useFactory: () => getTypeOrmConfig(),
    }),
    AuthModule,
    OperatorsModule,
    TokenModule,
    InboxesModule,
    OperatorInboxSubscriptionsModule,
    TenantsModule,
    ConversationsModule,
    AllocationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: DevTokenGuard,
    },
  ],
})
export class AppModule {}
