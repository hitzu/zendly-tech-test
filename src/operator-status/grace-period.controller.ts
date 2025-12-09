import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { GracePeriodService } from './grace-period.service';

@ApiTags('GracePeriod')
@Controller('grace-period')
export class GracePeriodController {
  constructor(
    private readonly gracePeriodService: GracePeriodService,
    @InjectPinoLogger(GracePeriodController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Post('process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process expired grace period assignments' })
  @ApiOkResponse({
    description: 'Number of processed grace period assignments',
    schema: {
      example: { processed: 2 },
    },
  })
  async processExpired(): Promise<{ processed: number }> {
    this.logger.info('Processing expired grace period assignments');
    return this.gracePeriodService.processExpiredGracePeriods();
  }
}
