import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ConversationState } from './conversation-state.enum';
import { ConversationRef } from './entities/conversation-ref.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ConversationContactResponseDto } from './dto/conversation-contact-response.dto';
import { ConversationHistoryResponseDto } from './dto/conversation-history-response.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import type {
  QueryConversationsDto,
  ConversationSort,
} from './dto/query-conversations.dto';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(ConversationRef)
    private readonly conversationRepository: Repository<ConversationRef>,
  ) {}

  async list(
    tenantId: number,
    query: QueryConversationsDto,
  ): Promise<ConversationRef[]> {
    const {
      inboxId,
      state,
      assignedOperatorId,
      customerPhoneNumber,
      labelId,
      sort = 'newest',
      limit = 20,
      offset,
      page,
    } = query;

    const safeLimit = Math.min(limit ?? 20, 100);
    const start = page ? (page - 1) * safeLimit : (offset ?? 0);
    const qb = this.conversationRepository.createQueryBuilder('conversation');
    qb.where('conversation.tenant_id = :tenantId', { tenantId });
    if (inboxId) {
      qb.andWhere('conversation.inbox_id = :inboxId', {
        inboxId,
      });
    }
    if (state) {
      qb.andWhere('conversation.state = :state', { state });
    }
    if (assignedOperatorId !== undefined) {
      qb.andWhere('conversation.assigned_operator_id = :assignedOperatorId', {
        assignedOperatorId,
      });
    }
    if (customerPhoneNumber) {
      qb.andWhere('conversation.customer_phone_number = :customerPhoneNumber', {
        customerPhoneNumber,
      });
    }
    if (labelId) {
      qb.innerJoin(
        'conversation.conversationLabels', // relación definida en ConversationRef
        'conversationLabel',
        'conversationLabel.labelId = :labelId', // propiedad, no columna
        { labelId },
      );
    }

    this.applySorting(qb, sort);
    qb.take(safeLimit).skip(start);
    return qb.getMany();
  }

  async findById(id: number): Promise<ConversationRef | null> {
    return this.conversationRepository.findOne({
      where: { id },
    });
  }

  async findByTenantAndId(
    tenantId: number,
    id: number,
  ): Promise<ConversationRef | null> {
    return this.conversationRepository.findOne({
      where: { tenantId, id },
    });
  }

  async getHistoryForConversation(
    tenantId: number,
    id: number,
  ): Promise<ConversationHistoryResponseDto | null> {
    const conversation = await this.findByTenantAndId(tenantId, id);
    if (!conversation) {
      return null;
    }
    return new ConversationHistoryResponseDto(conversation);
  }

  async getContactForConversation(
    tenantId: number,
    id: number,
  ): Promise<ConversationContactResponseDto | null> {
    const conversation = await this.findByTenantAndId(tenantId, id);
    if (!conversation) {
      return null;
    }
    return new ConversationContactResponseDto(conversation);
  }

  async upsert(dto: CreateConversationDto): Promise<ConversationRef> {
    const existing = await this.conversationRepository.findOne({
      where: {
        tenantId: dto.tenantId,
        externalConversationId: dto.externalConversationId,
      },
    });
    if (existing) {
      // Upsert behavior: update core metadata if conversation already exists.
      existing.inboxId = Number(dto.inboxId);
      existing.customerPhoneNumber = dto.customerPhoneNumber;
      existing.lastMessageAt =
        dto.lastMessageAt ?? existing.lastMessageAt ?? null;
      existing.messageCount = dto.messageCount ?? existing.messageCount ?? 0;
      existing.updatedAt = new Date();
      return this.conversationRepository.save(existing);
    }
    const conversation = this.conversationRepository.create({
      tenantId: dto.tenantId,
      inboxId: dto.inboxId,
      externalConversationId: dto.externalConversationId,
      customerPhoneNumber: dto.customerPhoneNumber,
      state: ConversationState.QUEUED,
      assignedOperatorId: null,
      lastMessageAt: dto.lastMessageAt ?? null,
      messageCount: dto.messageCount ?? 0,
      priorityScore: 0,
      resolvedAt: null,
    });
    return this.conversationRepository.save(conversation);
  }

  async updateMetadata(
    tenantId: number,
    id: number,
    dto: UpdateConversationDto,
  ): Promise<ConversationRef | undefined> {
    const existing = await this.findById(id);
    if (!existing) {
      return undefined;
    }
    if (dto.lastMessageAt !== undefined) {
      existing.lastMessageAt = dto.lastMessageAt;
    }
    if (dto.messageCount !== undefined) {
      existing.messageCount = dto.messageCount;
    }
    if (dto.priorityScore !== undefined) {
      existing.priorityScore = dto.priorityScore;
    }
    if (dto.customerPhoneNumber !== undefined) {
      existing.customerPhoneNumber = dto.customerPhoneNumber;
    }
    existing.updatedAt = new Date();
    return this.conversationRepository.save(existing);
  }

  private applySorting(
    qb: ReturnType<Repository<ConversationRef>['createQueryBuilder']>,
    sort: ConversationSort,
  ): void {
    if (sort === 'oldest') {
      qb.orderBy('conversation.createdAt', 'ASC');
      return;
    }
    if (sort === 'priority') {
      qb.orderBy('conversation.priorityScore', 'DESC').addOrderBy(
        'conversation.lastMessageAt',
        'DESC',
      );
      return;
    }
    qb.orderBy('conversation.createdAt', 'DESC');
  }
}
