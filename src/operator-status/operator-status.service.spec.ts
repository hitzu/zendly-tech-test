import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { AppDataSource } from '../config/database/data-source';
import { ConversationState } from '../conversations/conversation-state.enum';
import { ConversationRef } from '../conversations/entities/conversation-ref.entity';
import {
  GracePeriodAssignment,
  GracePeriodReason,
} from './entities/grace-period-assignment.entity';
import {
  OperatorAvailability,
  OperatorStatus,
} from './entities/operator-status.entity';
import { OperatorStatusService } from './operator-status.service';
import { ConversationRefFactory } from '@factories/conversation/conversation-ref.factory';
import { GracePeriodAssignmentFactory } from '@factories/grace-period/grace-period-assignment.factory';
import { InboxFactory } from '@factories/inbox/inbox.factory';
import { OperatorFactory } from '@factories/operator/operator.factory';
import { OperatorStatusFactory } from '@factories/operator-status/operator-status.factory';
import { TenantFactory } from '@factories/tenant/tenant.factory';
import { Operator } from '../operators/entities/operator.entity';

const useFixedDate = (fixed: Date) => {
  const RealDate = Date;
  const fixedMs = fixed.getTime();
  type DateInput = ConstructorParameters<typeof Date>[0];

  class MockDate extends RealDate {
    constructor(value?: DateInput) {
      super(value ?? fixedMs);
    }

    static now(): number {
      return fixedMs;
    }
  }

  // Assign static properties from the real Date (e.g., parse, UTC) to the mock
  Object.assign(MockDate, RealDate);

  // Replace global Date
  const globalWithDate = global as typeof globalThis & {
    Date: DateConstructor;
  };
  const originalDate = globalWithDate.Date;
  globalWithDate.Date = MockDate as unknown as DateConstructor;

  return () => {
    globalWithDate.Date = originalDate;
  };
};

describe('OperatorStatusService (unit)', () => {
  let service: OperatorStatusService;
  let operatorStatusRepo: Repository<OperatorStatus>;
  let graceRepo: Repository<GracePeriodAssignment>;
  let conversationRepo: Repository<ConversationRef>;
  let operatorsRepo: Repository<Operator>;

  let tenantFactory: TenantFactory;
  let operatorFactory: OperatorFactory;
  let inboxFactory: InboxFactory;
  let conversationFactory: ConversationRefFactory;
  let operatorStatusFactory: OperatorStatusFactory;
  let graceFactory: GracePeriodAssignmentFactory;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    operatorStatusRepo = AppDataSource.getRepository(OperatorStatus);
    operatorsRepo = AppDataSource.getRepository(Operator);
    graceRepo = AppDataSource.getRepository(GracePeriodAssignment);
    conversationRepo = AppDataSource.getRepository(ConversationRef);

    tenantFactory = new TenantFactory(AppDataSource);
    operatorFactory = new OperatorFactory(AppDataSource);
    inboxFactory = new InboxFactory(AppDataSource);
    conversationFactory = new ConversationRefFactory(AppDataSource);
    operatorStatusFactory = new OperatorStatusFactory(AppDataSource);
    graceFactory = new GracePeriodAssignmentFactory(AppDataSource);

    service = new OperatorStatusService(
      operatorStatusRepo,
      graceRepo,
      conversationRepo,
      operatorsRepo,
    );
  });

  describe('setStatus', () => {
    it('creates status and grace assignments when operator goes offline', async () => {
      const now = new Date('2024-01-01T00:00:00Z');
      const restoreDate = useFixedDate(now);

      try {
        const tenant = await tenantFactory.create();
        const operator = await operatorFactory.createForTenant(tenant.id);
        const inbox = await inboxFactory.createWithTenant(tenant);
        const conversation = await conversationFactory.createWithInbox(inbox, {
          state: ConversationState.ALLOCATED,
          assignedOperatorId: operator.id,
        });

        const result = await service.setStatus(
          tenant.id,
          operator.id,
          OperatorAvailability.OFFLINE,
        );

        expect(result.status).toBe(OperatorAvailability.OFFLINE);
        expect(result.lastStatusChangeAt.getTime()).toBe(now.getTime());

        const assignments = await graceRepo.find();
        expect(assignments).toHaveLength(1);
        expect(assignments[0]).toMatchObject({
          tenantId: tenant.id,
          conversationId: conversation.id,
          operatorId: operator.id,
          reason: GracePeriodReason.OFFLINE,
        });
        expect(assignments[0].expiresAt.getTime()).toBe(
          now.getTime() + 5 * 60 * 1000,
        );
      } finally {
        restoreDate();
      }
    });

    it('throws when operator is missing', async () => {
      await expect(
        service.setStatus(1, 99999, OperatorAvailability.AVAILABLE),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(await operatorStatusRepo.count()).toBe(0);
    });

    it('throws when operator belongs to another tenant', async () => {
      const tenant = await tenantFactory.create();
      const otherTenant = await tenantFactory.create();
      const operator = await operatorFactory.createForTenant(otherTenant.id);

      await expect(
        service.setStatus(
          tenant.id,
          operator.id,
          OperatorAvailability.AVAILABLE,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('removes grace assignments when coming back online', async () => {
      const now = new Date('2024-01-02T00:00:00Z');
      const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      const tenant = await tenantFactory.create();
      const operator = await operatorFactory.createForTenant(tenant.id);
      const inbox = await inboxFactory.createWithTenant(tenant);
      const conversation = await conversationFactory.createWithInbox(inbox, {
        state: ConversationState.ALLOCATED,
        assignedOperatorId: operator.id,
      });
      await graceFactory.createForConversation(conversation, operator, {
        expiresAt: new Date(now.getTime() + 60 * 1000),
      });

      const record = await service.setStatus(
        tenant.id,
        operator.id,
        OperatorAvailability.AVAILABLE,
      );

      expect(record.status).toBe(OperatorAvailability.AVAILABLE);
      expect(await graceRepo.count()).toBe(0);

      dateSpy.mockRestore();
    });
  });

  describe('getStatus', () => {
    it('returns null when status is missing', async () => {
      const tenant = await tenantFactory.create();

      const result = await service.getStatus(tenant.id, 123456);

      expect(result).toBeNull();
    });

    it('returns the status for the matching tenant', async () => {
      const now = new Date('2024-01-03T00:00:00Z');
      const tenant = await tenantFactory.create();
      const operator = await operatorFactory.createForTenant(tenant.id);
      await operatorStatusFactory.createForOperator(operator, {
        status: OperatorAvailability.AVAILABLE,
        lastStatusChangeAt: now,
      });

      const status = await service.getStatus(tenant.id, operator.id);

      expect(status?.status).toBe(OperatorAvailability.AVAILABLE);
      expect(status?.tenantId).toBe(tenant.id);
    });

    it('throws when status belongs to another tenant', async () => {
      const tenant = await tenantFactory.create();
      const otherTenant = await tenantFactory.create();
      const operator = await operatorFactory.createForTenant(otherTenant.id);
      await operatorStatusFactory.createForOperator(operator);

      await expect(
        service.getStatus(tenant.id, operator.id),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
