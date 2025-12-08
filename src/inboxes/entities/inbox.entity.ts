import { BaseTimeEntity } from '../../common/entities/base-time.entity';
import { Column, Entity } from 'typeorm';

@Entity('inboxes')
export class Inbox extends BaseTimeEntity {
  @Column('integer', { name: 'tenant_id' })
  tenantId!: number;

  @Column('text', { name: 'phone_number' })
  phoneNumber!: string;

  @Column('text', { name: 'display_name' })
  displayName!: string;

  @Column('boolean', { name: 'active', default: true })
  active!: boolean;
}
