import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import { OPERATOR_ROLES } from '../../common/types/operator-roles.type';
import { Token } from '../../token/entities/token.entity';

@Entity('operators')
export class Operator {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('text', { name: 'tenant_id' })
  tenantId!: string;

  @Column('text')
  name!: string;

  @Column({
    type: 'enum',
    enum: OPERATOR_ROLES,
    enumName: 'OPERATOR_ROLES',
  })
  role!: OPERATOR_ROLES;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({
    type: 'timestamptz',
    name: 'deleted_at',
    nullable: true,
  })
  deletedAt!: Date | null;

  @OneToMany(() => Token, (token) => token.operator)
  tokens?: Token[];
}
