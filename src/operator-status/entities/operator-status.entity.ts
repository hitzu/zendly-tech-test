import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';

import { Operator } from '../../operators/entities/operator.entity';
import { BaseTimeEntity } from '../../common/entities/base-time.entity';

export enum OperatorAvailability {
  AVAILABLE = 'AVAILABLE',
  OFFLINE = 'OFFLINE',
}

@Entity('operator_statuses')
export class OperatorStatus extends BaseTimeEntity {
  @PrimaryColumn('integer', { name: 'operator_id' })
  operatorId!: number;

  @Column('integer', { name: 'tenant_id' })
  tenantId!: number;

  @Column({
    type: 'enum',
    enum: OperatorAvailability,
    enumName: 'OPERATOR_AVAILABILITY',
    default: OperatorAvailability.OFFLINE,
  })
  status!: OperatorAvailability;

  @Column('timestamptz', { name: 'last_status_change_at' })
  lastStatusChangeAt!: Date;

  @OneToOne(() => Operator, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'operator_id' })
  operator?: Operator;
}
