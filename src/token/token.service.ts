import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TOKEN_TYPE } from '../common/types/token-type';
import { Token } from './entities/token.entity';
import type { Operator } from '../operator/entities/operator.entity';

interface RegisterTokenParams {
  token: string;
  type: TOKEN_TYPE;
  operatorId?: string | null;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
  ) {}

  async registerToken(params: RegisterTokenParams): Promise<Token> {
    const { token, type, operatorId } = params;

    const tokenEntity = this.tokenRepository.create({
      token,
      type,
      operator: operatorId ? ({ id: operatorId } as Operator) : null,
    });

    const savedToken = await this.tokenRepository.save(tokenEntity);
    this.logger.debug(
      { tokenId: savedToken.id, operatorId },
      'Token registered in store',
    );

    return savedToken;
  }

  async findActiveToken(rawToken: string): Promise<Token | null> {
    return this.tokenRepository.findOne({
      where: { token: rawToken },
      relations: { operator: true },
      withDeleted: false,
    });
  }
}

