import { ApiProperty } from '@nestjs/swagger';

import { Label } from '../entities/label.entity';

export class LabelResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  tenantId!: number;

  @ApiProperty()
  inboxId!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true, required: false })
  color?: string | null;

  @ApiProperty()
  createdByOperatorId!: number;

  constructor(label: Label) {
    this.id = label.id;
    this.tenantId = label.tenantId;
    this.inboxId = label.inboxId;
    this.name = label.name;
    this.color = label.color ?? null;
    this.createdByOperatorId = label.createdByOperatorId;
  }
}
