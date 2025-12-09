import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ConversationsService } from '../conversations/conversations.service';
import { ConversationState } from '../conversations/conversation-state.enum';
import { ConversationRef } from '../conversations/entities/conversation-ref.entity';
import { DevTokenRole } from '../auth/guards/dev-token.guard';
import { OperatorInboxSubscriptionsService } from '../operator-inbox-subscriptions/operator-inbox-subscriptions.service';
import { InboxesService } from '../inboxes/inboxes.service';
import { OperatorsService } from '../operators/operators.service';
import { EXCEPTION_RESPONSE } from '../config/errors/exception-response.config';
import { OperatorAvailability } from '../operator-status/entities/operator-status.entity';
import { OperatorStatusService } from '../operator-status/operator-status.service';
import { PriorityConfigService } from './priority-config.service';

interface OperatorContext {
  tenantId: number;
  operatorId: number;
  role: DevTokenRole;
}

@Injectable()
export class AllocationService {
  constructor(
    @InjectRepository(ConversationRef)
    private readonly conversationRepository: Repository<ConversationRef>,
    private readonly conversationsService: ConversationsService,
    private readonly operatorInboxSubscriptionsService: OperatorInboxSubscriptionsService,
    private readonly inboxesService: InboxesService,
    private readonly operatorsService: OperatorsService,
    private readonly operatorStatusService: OperatorStatusService,
    private readonly priorityConfigService: PriorityConfigService,
  ) {}

  async allocateNextForOperator(
    context: OperatorContext,
  ): Promise<ConversationRef | null> {
    const { tenantId, operatorId } = context;
    await this.ensureOperatorAvailable(tenantId, operatorId);
    const subscriptions =
      await this.operatorInboxSubscriptionsService.listByTenant(tenantId, {
        operatorId,
      });
    if (!Array.isArray(subscriptions) || !subscriptions.length) {
      return null;
    }
    const inboxIds =
      subscriptions?.map((subscription) => subscription.inboxId) ?? [];

    const qb = this.conversationRepository.createQueryBuilder('conversation');
    qb.where('conversation.tenant_id = :tenantId', { tenantId })
      .andWhere('conversation.state = :state', {
        state: ConversationState.QUEUED,
      })
      .andWhere('conversation.inbox_id IN (:...inboxIds)', { inboxIds })
      .orderBy('conversation.last_message_at', 'DESC')
      .take(100);
    const candidates = await qb.getMany();
    if (!candidates.length) {
      return null;
    }

    const sorted = await this.scoreAndSortCandidates(tenantId, candidates);
    const candidateEntry = sorted[0];
    const candidate = candidateEntry?.conversation;
    if (!candidate) {
      return null;
    }

    const fresh = await this.conversationRepository.findOne({
      where: { tenantId, id: candidate.id },
    });
    if (!fresh || fresh.state !== ConversationState.QUEUED) {
      return null;
    }

    // TODO: apply DB-level row locking (SELECT ... FOR UPDATE) to avoid races.
    fresh.state = ConversationState.ALLOCATED;
    fresh.assignedOperatorId = operatorId;
    fresh.priorityScore =
      candidateEntry?.priority ?? fresh.priorityScore ?? 0;
    fresh.updatedAt = new Date();
    return this.conversationRepository.save(fresh);
  }

  async claimQueuedConversation(
    context: OperatorContext,
    conversationId: number,
  ): Promise<ConversationRef> {
    const { tenantId, operatorId } = context;
    await this.ensureOperatorAvailable(tenantId, operatorId);
    const conversation =
      await this.conversationsService.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (conversation.state !== ConversationState.QUEUED) {
      throw new ConflictException('Conversation already taken');
    }
    const subscriptions =
      await this.operatorInboxSubscriptionsService.listByTenant(tenantId, {
        operatorId,
        inboxId: conversation.inboxId,
      });
    if (!subscriptions.length) {
      throw new ForbiddenException('Operator not subscribed to inbox');
    }

    // TODO: add DB-level locking for claim to prevent double-allocation.
    conversation.state = ConversationState.ALLOCATED;
    conversation.assignedOperatorId = operatorId;
    conversation.updatedAt = new Date();
    return this.conversationRepository.save(conversation);
  }

  async resolveConversation(
    context: OperatorContext,
    conversationId: number,
  ): Promise<ConversationRef> {
    const { operatorId, role } = context;

    const conversation =
      await this.conversationsService.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException(EXCEPTION_RESPONSE.CONVERSATION_NOT_FOUND);
    }
    if (conversation.state !== ConversationState.ALLOCATED) {
      throw new BadRequestException(
        'Only allocated conversations can be resolved',
      );
    }
    if (
      conversation.assignedOperatorId !== operatorId &&
      !this.isManagerOrAdmin(role)
    ) {
      throw new ForbiddenException('Not allowed to resolve this conversation');
    }

    conversation.state = ConversationState.RESOLVED;
    conversation.resolvedAt = new Date();
    conversation.updatedAt = new Date();
    // await this.emitResolvedEventStub(conversation);
    return this.conversationRepository.save(conversation);
  }

  private async ensureOperatorAvailable(
    tenantId: number,
    operatorId: number,
  ): Promise<void> {
    const status = await this.operatorStatusService.getStatus(
      tenantId,
      operatorId,
    );
    if (status && status.status === OperatorAvailability.OFFLINE) {
      throw new ConflictException('Operator is offline');
    }
  }

  async deallocateConversation(
    context: OperatorContext,
    conversationId: number,
  ): Promise<ConversationRef> {
    const { operatorId, role } = context;
    const conversation =
      await this.conversationsService.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (conversation.state !== ConversationState.ALLOCATED) {
      throw new BadRequestException(
        'Only allocated conversations can be deallocated',
      );
    }
    if (
      conversation.assignedOperatorId !== operatorId &&
      !this.isManagerOrAdmin(role)
    ) {
      throw new ForbiddenException(
        'Not allowed to deallocate this conversation',
      );
    }

    // TODO: integrate grace period handling before returning to queue.
    conversation.state = ConversationState.QUEUED;
    conversation.assignedOperatorId = null;
    conversation.updatedAt = new Date();
    return this.conversationRepository.save(conversation);
  }

  async reassignConversation(
    context: OperatorContext,
    conversationId: number,
    newOperatorId: number,
  ): Promise<ConversationRef> {
    const { tenantId, role } = context;
    if (!this.isManagerOrAdmin(role)) {
      throw new ForbiddenException('Only managers or admins can reassign');
    }
    const conversation =
      await this.conversationsService.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (conversation.state !== ConversationState.ALLOCATED) {
      throw new BadRequestException(
        'Only allocated conversations can be reassigned',
      );
    }

    const newOperator =
      await this.operatorsService.findOperatorById(newOperatorId);
    if (!newOperator) {
      throw new NotFoundException('New operator not found');
    }
    if (newOperator.tenantId !== tenantId) {
      throw new ForbiddenException('Cannot reassign across tenants');
    }

    const inboxCheck =
      await this.operatorInboxSubscriptionsService.listByTenant(tenantId, {
        operatorId: newOperatorId,
        inboxId: conversation.inboxId,
      });
    if (!inboxCheck.length) {
      // Enforce inbox subscription to avoid assigning out-of-scope operators.
      throw new BadRequestException(
        'Operator is not subscribed to the conversation inbox',
      );
    }

    conversation.assignedOperatorId = newOperatorId;
    conversation.updatedAt = new Date();
    return this.conversationRepository.save(conversation);
  }

  async moveConversationInbox(
    context: OperatorContext,
    conversationId: number,
    newInboxId: number,
  ): Promise<ConversationRef> {
    const { tenantId, role } = context;
    if (!this.isManagerOrAdmin(role)) {
      throw new ForbiddenException(
        'Only managers or admins can move a conversation',
      );
    }
    const conversation =
      await this.conversationsService.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const newInbox = await this.inboxesService.findById(tenantId, newInboxId);
    if (!newInbox) {
      throw new NotFoundException('Inbox not found');
    }
    if (newInbox.tenantId !== tenantId) {
      throw new ForbiddenException('Cannot move conversation across tenants');
    }

    conversation.inboxId = newInboxId;
    // Reset allocation to allow the new inbox queue to manage the conversation.
    conversation.state = ConversationState.QUEUED;
    conversation.assignedOperatorId = null;
    conversation.updatedAt = new Date();
    return this.conversationRepository.save(conversation);
  }

  private async scoreAndSortCandidates(
    tenantId: number,
    conversations: ConversationRef[],
  ): Promise<
    { conversation: ConversationRef; priority: number; lastTimestamp: Date }[]
  > {
    if (!conversations.length) {
      return [];
    }

    const { alpha, beta } = await this.priorityConfigService.getWeights(tenantId);
    const now = Date.now();

    const withFeatures = conversations.map((conversation) => {
      const lastTimestamp = conversation.lastMessageAt ?? conversation.createdAt;
      const delayMs = Math.max(0, now - lastTimestamp.getTime());
      const msgCount = conversation.messageCount ?? 0;
      return { conversation, msgCount, delayMs, lastTimestamp };
    });

    const msgCounts = withFeatures.map((entry) => entry.msgCount);
    const delays = withFeatures.map((entry) => entry.delayMs);
    const msgMin = Math.min(...msgCounts);
    const msgMax = Math.max(...msgCounts);
    const delayMin = Math.min(...delays);
    const delayMax = Math.max(...delays);
    const msgRange = msgMax - msgMin;
    const delayRange = delayMax - delayMin;

    return withFeatures
      .map((entry) => {
        const normMsg =
          msgRange === 0 ? 0 : (entry.msgCount - msgMin) / msgRange;
        const normDelay =
          delayRange === 0 ? 0 : (entry.delayMs - delayMin) / delayRange;
        const priority = alpha * normMsg + beta * normDelay;
        return { ...entry, priority };
      })
      .sort((a, b) => {
        const byPriority = b.priority - a.priority;
        if (byPriority !== 0) {
          return byPriority;
        }
        return b.lastTimestamp.getTime() - a.lastTimestamp.getTime();
      });
  }

  private isManagerOrAdmin(role: DevTokenRole): boolean {
    return role === 'MANAGER' || role === 'ADMIN';
  }

  // private async emitResolvedEventStub(
  //   conversation: ConversationRef,
  // ): Promise<void> {
  //   // TODO: integrate with Orchestrator event client after it is available.
  //   return Promise.resolve();
  // }
}
