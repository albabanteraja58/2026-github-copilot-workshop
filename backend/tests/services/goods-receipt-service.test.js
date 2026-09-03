import { describe, expect, jest, test } from '@jest/globals';
import { createGoodsReceipt } from '../../src/services/goods-receipt-service.js';

function mockDb(client) {
  return {
    pool: { connect: jest.fn(() => Promise.resolve(client)) },
    query: jest.fn(),
  };
}

function mockClient(queryResponses) {
  return {
    query: jest.fn((sql) => queryResponses(sql)),
    release: jest.fn(),
  };
}

const validPayload = {
  poId: 'po-1',
  lines: [{ poLineId: 'po-line-1', qtyReceived: 3, actualSiteCode: 'WH-01' }],
};

describe('createGoodsReceipt validation', () => {
  test('rejects a missing purchase order with 422', async () => {
    await expect(createGoodsReceipt(mockDb(null), { lines: validPayload.lines }))
      .rejects.toMatchObject({ statusCode: 422, message: 'poId is required' });
  });

  test('rejects receipt quantity above PR remaining quantity with 422', async () => {
    const client = mockClient((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('FROM purchase_orders WHERE id')) return { rows: [{ id: 'po-1' }], rowCount: 1 };
      if (sql.includes('FROM po_lines pl')) {
        return {
          rows: [{
            id: 'po-line-1', po_id: 'po-1', qty_ordered: 100, qty_received: 0,
            pr_allocated_qty: 10, gr_reserved_qty: 0,
          }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    });

    await expect(createGoodsReceipt(mockDb(client), {
      ...validPayload,
      lines: [{ ...validPayload.lines[0], qtyReceived: 11 }],
    })).rejects.toMatchObject({
      statusCode: 422,
      message: 'lines[0]: receipt qty 11 exceeds PR remaining qty 10',
    });
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });
});