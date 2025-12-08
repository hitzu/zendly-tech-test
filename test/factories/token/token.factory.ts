import type { FactorizedAttrs } from '@jorgebodega/typeorm-factory';
import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { Factory } from '@jorgebodega/typeorm-factory';
import { Token } from '../../../src/tokens/entities/token.entity';
import { TOKEN_TYPE } from '../../../src/common/types/token-type';
import { Operator } from '../../../src/operators/entities/operator.entity';

export class TokenFactory extends Factory<Token> {
  protected entity = Token;
  protected dataSource: DataSource;

  constructor(dataSource: DataSource) {
    super();
    this.dataSource = dataSource;
  }

  protected attrs(): FactorizedAttrs<Token> {
    return {
      token: faker.string.alphanumeric(100),
      type: faker.helpers.arrayElement<TOKEN_TYPE>(Object.values(TOKEN_TYPE)),
      // operator should be provided via makeForOperator or createForOperator methods
    };
  }

  /**
   * Creates a token with a specific operator
   */
  async makeForOperator(operator: Operator, type?: TOKEN_TYPE): Promise<Token> {
    return this.make({
      operator,
      type:
        type ||
        faker.helpers.arrayElement<TOKEN_TYPE>(Object.values(TOKEN_TYPE)),
    });
  }

  /**
   * Creates and persists a token for a specific operator
   */
  async createForOperator(
    operator: Operator,
    type?: TOKEN_TYPE,
  ): Promise<Token> {
    const token = await this.makeForOperator(operator, type);
    return this.dataSource.getRepository(Token).save(token);
  }
}
