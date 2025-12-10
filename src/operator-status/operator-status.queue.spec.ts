import {
  OperatorAvailability,
  OperatorStatus,
} from './entities/operator-status.entity';
import { OperatorStatusQueue } from './operator-status.queue';
import { OperatorStatusService } from './operator-status.service';

class OperatorStatusServiceMock {
  setStatus = jest.fn<
    Promise<OperatorStatus>,
    [tenantId: number, operatorId: number, status: OperatorAvailability]
  >();

  getStatus = jest.fn();
}

describe('OperatorStatusQueue', () => {
  let queue: OperatorStatusQueue;
  let operatorStatusService: OperatorStatusServiceMock;

  beforeEach(() => {
    operatorStatusService = new OperatorStatusServiceMock();
    operatorStatusService.setStatus.mockReset();
    queue = new OperatorStatusQueue(
      operatorStatusService as unknown as OperatorStatusService,
    );
  });

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  it('processes enqueued jobs and calls setStatus', async () => {
    operatorStatusService.setStatus.mockResolvedValue({} as OperatorStatus);

    queue.enqueue(1, 2, OperatorAvailability.AVAILABLE);

    await Promise.resolve();

    expect(operatorStatusService.setStatus).toHaveBeenCalledWith(
      1,
      2,
      OperatorAvailability.AVAILABLE,
    );
  });

  it('retries failed jobs with backoff until success', async () => {
    operatorStatusService.setStatus
      .mockRejectedValueOnce(new Error('first'))
      .mockRejectedValueOnce(new Error('second'))
      .mockResolvedValueOnce({} as OperatorStatus);

    queue.enqueue(1, 2, OperatorAvailability.OFFLINE);

    await Promise.resolve();
    expect(operatorStatusService.setStatus).toHaveBeenCalledTimes(1);

    await sleep(1100);
    expect(operatorStatusService.setStatus).toHaveBeenCalledTimes(2);

    await sleep(1600);
    expect(operatorStatusService.setStatus).toHaveBeenCalledTimes(3);
  });
});
