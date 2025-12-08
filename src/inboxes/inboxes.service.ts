import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateInboxDto } from './dto/create-inbox.dto';
import { UpdateInboxDto } from './dto/update-inbox.dto';
import { Inbox } from './entities/inbox.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';

@Injectable()
export class InboxesService {
  private readonly logger = new Logger(InboxesService.name);

  constructor(
    @InjectRepository(Inbox)
    private readonly inboxRepository: Repository<Inbox>,
  ) {}

  async listByTenant(
    tenantId: number,
    relations: string[] = [],
  ): Promise<Inbox[]> {
    try {
      return await this.inboxRepository.find({
        where: {
          tenantId,
          active: true,
        },
        relations,
      });
    } catch (error) {
      this.logger.error(
        { tenantId },
        'Failed to list inboxes by tenant',
        error,
      );
      throw error;
    }
  }

  async listByIds(tenantId: number, inboxIds: number[]): Promise<Inbox[]> {
    try {
      const scoped = await this.listByTenant(tenantId);
      if (!inboxIds.length) {
        return [];
      }
      return scoped.filter((inbox) => inboxIds.includes(inbox.id));
    } catch (error) {
      this.logger.error(
        { tenantId, inboxIds },
        `Failed to list inboxes by ids: ${error}`,
      );
      throw error;
    }
  }

  async findById(tenantId: number, id: number): Promise<Inbox | null> {
    try {
      const inbox = await this.inboxRepository.findOne({
        where: {
          tenantId,
          id,
        },
      });
      if (!inbox) {
        return null;
      }
      return inbox;
    } catch (error) {
      this.logger.error({ tenantId, id }, 'Failed to find inbox', error);
      throw error;
    }
  }

  async createInbox(
    tenantId: number,
    createInboxDto: CreateInboxDto,
  ): Promise<Inbox> {
    try {
      const existing = await this.inboxRepository.findOne({
        where: {
          tenantId,
          phoneNumber: createInboxDto.phoneNumber,
        },
      });

      if (existing) {
        throw new BadRequestException(
          'Phone number already used by another inbox in this tenant',
        );
      }

      const inbox = this.inboxRepository.create({
        tenantId,
        phoneNumber: createInboxDto.phoneNumber,
        displayName: createInboxDto.displayName,
        active: true,
      });
      const savedInbox = await this.inboxRepository.save(inbox);

      return savedInbox;
    } catch (error) {
      this.logger.error(
        { tenantId, createInboxDto },
        `Failed to create inbox: ${error}`,
      );
      throw error;
    }
  }

  async updateInbox(
    tenantId: number,
    id: number,
    updateInboxDto: UpdateInboxDto,
  ): Promise<Inbox> {
    const inbox = await this.findById(tenantId, id);
    if (!inbox) {
      throw new NotFoundException('Inbox not found');
    }

    await this.inboxRepository.update(id, {
      ...updateInboxDto,
    });

    const updatedInbox = await this.findById(tenantId, id);
    if (!updatedInbox) {
      throw new NotFoundException('Inbox not found');
    }
    return updatedInbox;
  }

  async removeInbox(tenantId: number, id: number): Promise<void> {
    const inbox = await this.findById(tenantId, id);
    if (!inbox) {
      throw new NotFoundException('Inbox not found');
    }

    await this.inboxRepository.softDelete(id);
    this.logger.log({ tenantId, id }, 'Inbox removed');
  }
}
