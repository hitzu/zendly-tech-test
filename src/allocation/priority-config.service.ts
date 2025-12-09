import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type PriorityWeights = { alpha: number; beta: number };

@Injectable()
export class PriorityConfigService {
  constructor(private readonly configService: ConfigService) {}

  async getWeights(_tenantId: number): Promise<PriorityWeights> {
    const alphaRaw = this.configService.get<number>('PRIORITY_ALPHA', 0.5);
    const betaRaw = this.configService.get<number>('PRIORITY_BETA', 0.5);

    const alpha = Number.isFinite(alphaRaw) ? alphaRaw : 0.5;
    const beta = Number.isFinite(betaRaw) ? betaRaw : 0.5;
    const total = alpha + beta;

    if (total <= 0) {
      return { alpha: 0.5, beta: 0.5 };
    }

    // Normalize to keep weights comparable even if config does not sum to 1.
    return { alpha: alpha / total, beta: beta / total };
  }
}

