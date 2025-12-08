import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateOperatorInboxSubscriptionDto } from './dto/create-operator-inbox-subscription.dto';
import { OperatorInboxSubscription } from './entities/operator-inbox-subscription.entity';

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
      return this.operatorInboxSubscriptionRepository.find({
        where: {
          tenantId,
          operatorId: filters?.operatorId,
          inboxId: filters?.inboxId,
        },
      });
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
        operatorId: createOperatorInboxSubscriptionDto.operatorId,
        inboxId: createOperatorInboxSubscriptionDto.inboxId,
      });
      return this.operatorInboxSubscriptionRepository.save(subscription);
    } catch (error) {
      this.logger.error(
        { tenantId, createOperatorInboxSubscriptionDto },
        `Failed to create operator inbox subscription: ${error}`,
      );
      throw error;
    }
  }

  async removeSubscription(tenantId: number, id: number): Promise<void> {
    try {
      await this.operatorInboxSubscriptionRepository.delete(id);
    } catch (error) {
      this.logger.error(
        { tenantId, id },
        `Failed to remove operator inbox subscription: ${error}`,
      );
      throw error;
    }
  }
}
