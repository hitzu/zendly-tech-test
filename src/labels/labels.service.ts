import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ConversationRef } from '../conversations/entities/conversation-ref.entity';
import { Inbox } from '../inboxes/entities/inbox.entity';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { ConversationLabel } from './entities/conversation-label.entity';
import { Label } from './entities/label.entity';

@Injectable()
export class LabelsService {
  private readonly logger = new Logger(LabelsService.name);

  constructor(
    @InjectRepository(Label)
    private readonly labelRepository: Repository<Label>,
    @InjectRepository(ConversationLabel)
    private readonly conversationLabelRepository: Repository<ConversationLabel>,
    @InjectRepository(Inbox)
    private readonly inboxRepository: Repository<Inbox>,
    @InjectRepository(ConversationRef)
    private readonly conversationRepository: Repository<ConversationRef>,
  ) {}

  async createLabel(
    tenantId: number,
    operatorId: number,
    dto: CreateLabelDto,
  ): Promise<Label> {
    this.logger.log(
      { tenantId, operatorId, inboxId: dto.inboxId, name: dto.name },
      'Creating label',
    );

    const inbox = await this.inboxRepository.findOne({
      where: { id: dto.inboxId, tenantId },
    });
    if (!inbox) {
      throw new NotFoundException('Inbox not found for tenant');
    }

    const existing = await this.labelRepository.findOne({
      where: {
        tenantId,
        inboxId: dto.inboxId,
        name: dto.name,
      },
      withDeleted: false,
    });
    if (existing) {
      throw new ConflictException(
        'Label with this name already exists for the inbox',
      );
    }

    const color = dto.color === '' ? null : (dto.color ?? null);
    const label = this.labelRepository.create({
      tenantId,
      inboxId: dto.inboxId,
      name: dto.name,
      color,
      createdByOperatorId: operatorId,
    });
    const saved = await this.labelRepository.save(label);
    this.logger.log({ labelId: saved.id, tenantId }, 'Label created');
    return saved;
  }

  async listLabels(tenantId: number, inboxId?: number): Promise<Label[]> {
    const labels = await this.labelRepository.find({
      where: {
        tenantId,
        ...(inboxId ? { inboxId } : {}),
      },
      order: { createdAt: 'DESC' },
    });
    this.logger.log(
      { tenantId, inboxId, count: labels.length },
      'Listed labels',
    );
    return labels;
  }

  async getLabel(tenantId: number, id: number): Promise<Label> {
    const label = await this.labelRepository.findOne({
      where: { id, tenantId },
    });
    if (!label) {
      throw new NotFoundException('Label not found');
    }
    return label;
  }

  async updateLabel(
    tenantId: number,
    id: number,
    dto: UpdateLabelDto,
  ): Promise<Label> {
    const label = await this.getLabel(tenantId, id);

    if (dto.name && dto.name !== label.name) {
      const conflict = await this.labelRepository.findOne({
        where: {
          tenantId,
          inboxId: label.inboxId,
          name: dto.name,
        },
      });
      if (conflict) {
        throw new ConflictException(
          'Label with this name already exists for the inbox',
        );
      }
    }

    if (dto.name) {
      label.name = dto.name;
    }
    if (dto.color !== undefined) {
      label.color = dto.color === '' ? null : (dto.color ?? null);
    }

    const saved = await this.labelRepository.save(label);
    this.logger.log({ tenantId, labelId: id }, 'Label updated');
    return saved;
  }

  async deleteLabel(tenantId: number, id: number): Promise<void> {
    const result = await this.labelRepository.softDelete({ id, tenantId });
    if (!result.affected) {
      throw new NotFoundException('Label not found');
    }
    this.logger.log({ tenantId, labelId: id }, 'Label deleted');
  }

  async attachLabelToConversation(
    tenantId: number,
    conversationId: number,
    labelId: number,
  ): Promise<ConversationLabel> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, tenantId },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found for tenant');
    }

    const label = await this.labelRepository.findOne({
      where: { id: labelId, tenantId },
    });
    if (!label) {
      throw new NotFoundException('Label not found for tenant');
    }
    if (label.inboxId !== conversation.inboxId) {
      throw new BadRequestException(
        'Label inbox does not match conversation inbox',
      );
    }

    const existing = await this.conversationLabelRepository.findOne({
      where: { conversationId, labelId },
    });
    if (existing) {
      return existing;
    }

    const link = this.conversationLabelRepository.create({
      conversationId,
      labelId,
    });
    const saved = await this.conversationLabelRepository.save(link);
    this.logger.log(
      { tenantId, conversationId, labelId },
      'Label attached to conversation',
    );
    return saved;
  }

  async detachLabelFromConversation(
    tenantId: number,
    conversationId: number,
    labelId: number,
  ): Promise<void> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, tenantId },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found for tenant');
    }

    const label = await this.labelRepository.findOne({
      where: { id: labelId, tenantId },
    });
    if (!label) {
      throw new NotFoundException('Label not found for tenant');
    }

    const result = await this.conversationLabelRepository.delete({
      conversationId,
      labelId,
    });
    if (!result.affected) {
      throw new NotFoundException('Label not attached to conversation');
    }
    this.logger.log(
      { tenantId, conversationId, labelId },
      'Label detached from conversation',
    );
  }
}
