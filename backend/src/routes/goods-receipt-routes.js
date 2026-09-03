import { createGoodsReceipt, getGoodsReceiptById, listGoodsReceipts, postGoodsReceipt } from '../services/goods-receipt-service.js';

function sendServiceError(error, reply) {
  if (error.statusCode) return reply.code(error.statusCode).send({ message: error.message });
  throw error;
}

export default async function goodsReceiptRoutes(fastify) {
  fastify.get('/api/goods-receipts', async () => ({ items: await listGoodsReceipts(fastify.db) }));

  fastify.post('/api/goods-receipts', async (request, reply) => {
    try {
      const receipt = await createGoodsReceipt(fastify.db, request.body);
      return reply.code(201).send(receipt);
    } catch (error) { return sendServiceError(error, reply); }
  });

  fastify.post('/api/goods-receipts/:id/post', async (request, reply) => {
    try {
      const receipt = await postGoodsReceipt(fastify.db, request.params.id);
      if (!receipt) return reply.code(404).send({ message: 'Goods receipt not found' });
      return receipt;
    } catch (error) { return sendServiceError(error, reply); }
  });

  fastify.get('/api/goods-receipts/:id', async (request, reply) => {
    const receipt = await getGoodsReceiptById(fastify.db, request.params.id);
    if (!receipt) return reply.code(404).send({ message: 'Goods receipt not found' });
    return receipt;
  });
}