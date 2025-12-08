import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { OperatorFactory } from '../../test/factories/operator/operator.factory';
import { TenantFactory } from '../../test/factories/tenant/tenant.factory';
import { OPERATOR_ROLES } from '../common/types/operator-roles.type';
import { AppDataSource as TestDataSource } from '../config/database/data-source';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';
import { Operator } from './entities/operator.entity';
import { OperatorsService } from './operators.service';
import { Tenant } from '../tenants/entities/tenant.entity';

describe('OperatorsService', () => {
  let service: OperatorsService;
  let repository: Repository<Operator>;
  let operatorFactory: OperatorFactory;
  let tenantFactory: TenantFactory;
  let tenantRepository: Repository<Tenant>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperatorsService,
        {
          provide: getRepositoryToken(Operator),
          useValue: TestDataSource.getRepository(Operator),
        },
      ],
    }).compile();

    service = module.get<OperatorsService>(OperatorsService);
    repository = module.get<Repository<Operator>>(getRepositoryToken(Operator));
    operatorFactory = new OperatorFactory(TestDataSource);
    tenantFactory = new TenantFactory(TestDataSource);
    tenantRepository = TestDataSource.getRepository(Tenant);
  });

  it('creates an operator with generated id', async () => {
    const tenant = await tenantRepository.save(await tenantFactory.make());

    const dto: CreateOperatorDto = {
      name: 'Jane Operator',
      tenantId: tenant.id,
      role: OPERATOR_ROLES.OPERATOR,
    };

    const operator = await service.createOperator(dto);

    expect(operator.id).toBeDefined();
    expect(operator.name).toBe(dto.name);
    expect(operator.tenantId).toBe(dto.tenantId);
    expect(operator.role).toBe(dto.role);
  });

  it('updates an operator', async () => {
    const tenant = await tenantRepository.save(await tenantFactory.make());
    const existing = await operatorFactory.make({ tenantId: tenant.id });

    const update: UpdateOperatorDto = { name: 'Updated Name' };
    const updated = await service.updateOperator(existing.id, update);

    expect(updated.name).toBe('Updated Name');
  });

  it('finds all operators', async () => {
    await repository.save(await operatorFactory.make());
    const operators = await service.findAllOperators();
    expect(Array.isArray(operators)).toBe(true);
  });
});
