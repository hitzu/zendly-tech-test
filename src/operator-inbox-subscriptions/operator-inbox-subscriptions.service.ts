import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { Inbox } from '../inboxes/entities/inbox.entity';
import { Operator } from '../operators/entities/operator.entity';
import { CreateOperatorInboxSubscriptionDto } from './dto/create-operator-inbox-subscription.dto';
import { OperatorInboxSubscription } from './entities/operator-inbox-subscription.entity';
import { EXCEPTION_RESPONSE } from 'src/config/errors/exception-response.config';

@Injectable()
export class OperatorInboxSubscriptionsService {
  private readonly logger = new Logger(OperatorInboxSubscriptionsService.name);

  constructor(
    @InjectRepository(OperatorInboxSubscription)
    private readonly operatorInboxSubscriptionRepository: Repository<OperatorInboxSubscription>,
  ) {}

  async listByTenant(
    tenantId: number,
    filters?: { operatorId?: number; inboxId?: number },
  ): Promise<OperatorInboxSubscription[]> {
    try {
      const query = this.operatorInboxSubscriptionRepository
        .createQueryBuilder('subscription')
        .where('subscription.tenant_id = :tenantId', { tenantId });

      if (filters?.operatorId !== undefined) {
        query.andWhere('subscription.operator_id = :operatorId', {
          operatorId: filters.operatorId,
        });
      }

      if (filters?.inboxId !== undefined) {
        query.andWhere('subscription.inbox_id = :inboxId', {
          inboxId: filters.inboxId,
        });
      }

      return query.getMany();
    } catch (error) {
      this.logger.error(
        { tenantId, filters },
        `Failed to list operator inbox subscriptions: ${error}`,
      );
      throw error;
    }
  }

  async createSubscription(
    tenantId: number,
    createOperatorInboxSubscriptionDto: CreateOperatorInboxSubscriptionDto,
  ): Promise<OperatorInboxSubscription> {
    try {
      const subscription = this.operatorInboxSubscriptionRepository.create({
        tenantId,
        operator: {
          id: createOperatorInboxSubscriptionDto.operatorId,
        } as Operator,
        inbox: { id: createOperatorInboxSubscriptionDto.inboxId } as Inbox,
      });
      const savedSubscription =
        await this.operatorInboxSubscriptionRepository.save(subscription);
      return savedSubscription;
    } catch (error) {
      this.logger.error(
        { tenantId, createOperatorInboxSubscriptionDto },
        `Failed to create operator inbox subscription 123123131232131: ${error}`,
      );

      if (error instanceof QueryFailedError) {
        const driverErr = error.driverError as
          | { code?: string; detail?: unknown }
          | undefined;
        const code = driverErr?.code;
        const detail =
          typeof driverErr?.detail === 'string' ? driverErr.detail : undefined;

        if (code === '23503') {
          if (detail?.includes('operator_id')) {
            throw new NotFoundException(EXCEPTION_RESPONSE.OPERATOR_NOT_FOUND);
          }
          if (detail?.includes('inbox_id')) {
            throw new NotFoundException(EXCEPTION_RESPONSE.INBOX_NOT_FOUND);
          }
        }
      }
      throw error;
    }
  }

  async removeSubscription(tenantId: number, id: number): Promise<void> {
    try {
      await this.operatorInboxSubscriptionRepository.delete({ id, tenantId });
    } catch (error) {
      this.logger.error(
        { tenantId, id },
        `Failed to remove operator inbox subscription: ${error}`,
      );
      throw error;
    }
  }
}
