import { v4 as uuidv4 } from 'uuid';

function mapHeader(row) {
  return {
    id: row.id,
    grNumber: row.gr_number,
    poId: row.po_id,
    poNumber: row.po_number,
    vendorName: row.vendor_name,
    status: row.status,
    receiptDate: row.receipt_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLine(row) {
  return {
    id: row.id,
    poLineId: row.po_line_id,
    lineNo: row.line_no,
    itemCode: row.item_code,
    itemName: row.item_name,
    qtyReceived: Number(row.qty_received),
    actualSiteCode: row.actual_site_code,
  };
}

function createGrNumber(count) {
  return `GR-2026-${String(Number(count) + 1).padStart(4, '0')}`;
}

function ruleError(message) {
  const error = new Error(message);
  error.statusCode = 422;
  return error;
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') return 'Body is required';
  if (!payload.poId) return 'poId is required';
  if (!Array.isArray(payload.lines) || payload.lines.length === 0) return 'lines must contain at least one item';

  for (let index = 0; index < payload.lines.length; index += 1) {
    const line = payload.lines[index];
    if (!line.poLineId) return `lines[${index}].poLineId is required`;
    if (!Number.isFinite(Number(line.qtyReceived)) || Number(line.qtyReceived) <= 0) {
      return `lines[${index}].qtyReceived must be greater than 0`;
    }
    if (!line.actualSiteCode || typeof line.actualSiteCode !== 'string' || !line.actualSiteCode.trim()) {
      return `lines[${index}].actualSiteCode is required`;
    }
  }

  return null;
}

async function getLineCapacity(client, poLineId, excludeGrId = null) {
  const result = await client.query(
    `SELECT pl.id, pl.po_id, pl.line_no, pl.item_code, pl.item_name,
            pl.qty_ordered, pl.qty_received, pl.uom, pl.site_code,
            COALESCE(SUM(a.allocated_qty), 0) AS pr_allocated_qty,
            COALESCE((
              SELECT SUM(gl.qty_received)
              FROM gr_lines gl
              JOIN goods_receipts gx ON gx.id = gl.gr_id
              WHERE gl.po_line_id = pl.id
                AND gx.status = 'DRAFT'
                AND ($2::uuid IS NULL OR gl.gr_id <> $2::uuid)
            ), 0) AS gr_reserved_qty,
            COALESCE((
              SELECT SUM(gl.qty_received)
              FROM gr_lines gl
              JOIN goods_receipts gx ON gx.id = gl.gr_id
              WHERE gl.po_line_id = pl.id AND gx.status = 'POSTED'
            ), 0) AS gr_posted_qty
     FROM po_lines pl
     LEFT JOIN pr_line_allocations a ON a.po_line_id = pl.id
     WHERE pl.id = $1
     GROUP BY pl.id`,
    [poLineId, excludeGrId]
  );
  return result.rows[0] || null;
}

async function validateLines(client, poId, lines, excludeGrId = null) {
  const requestedByLine = new Map();
  lines.forEach((line, index) => {
    const existing = requestedByLine.get(line.poLineId) || { quantity: 0, index };
    requestedByLine.set(line.poLineId, {
      quantity: existing.quantity + Number(line.qtyReceived),
      index: existing.index,
    });
  });

  for (const [poLineId, request] of requestedByLine) {
    const row = await getLineCapacity(client, poLineId, excludeGrId);
    if (!row) throw ruleError(`lines[${request.index}]: PO line not found`);
    if (row.po_id !== poId) throw ruleError(`lines[${request.index}]: PO line does not belong to purchase order`);

    const poRemaining = Number(row.qty_ordered) - Number(row.qty_received) - Number(row.gr_reserved_qty || 0);
    const prRemaining = Number(row.pr_allocated_qty) - Number(row.gr_posted_qty || 0) - Number(row.gr_reserved_qty || 0);
    if (request.quantity > poRemaining) {
      throw ruleError(`lines[${request.index}]: receipt qty ${request.quantity} exceeds PO remaining qty ${poRemaining}`);
    }
    if (request.quantity > prRemaining) {
      throw ruleError(`lines[${request.index}]: receipt qty ${request.quantity} exceeds PR remaining qty ${prRemaining}`);
    }
  }
}

export async function listGoodsReceipts(db) {
  const { rows } = await db.query(
    `SELECT gr.*, po.po_number, po.vendor_name
     FROM goods_receipts gr
     JOIN purchase_orders po ON po.id = gr.po_id
     ORDER BY gr.created_at DESC`
  );
  return rows.map(mapHeader);
}

export async function getGoodsReceiptById(db, id) {
  const headerResult = await db.query(
    `SELECT gr.*, po.po_number, po.vendor_name
     FROM goods_receipts gr
     JOIN purchase_orders po ON po.id = gr.po_id
     WHERE gr.id = $1`,
    [id]
  );
  if (headerResult.rowCount === 0) return null;
  const linesResult = await db.query(
    `SELECT gl.*, pl.item_code, pl.item_name
     FROM gr_lines gl JOIN po_lines pl ON pl.id = gl.po_line_id
     WHERE gl.gr_id = $1 ORDER BY gl.line_no`,
    [id]
  );
  return { ...mapHeader(headerResult.rows[0]), lines: linesResult.rows.map(mapLine) };
}

export async function createGoodsReceipt(db, payload) {
  const validationError = validatePayload(payload);
  if (validationError) throw ruleError(validationError);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const poResult = await client.query(`SELECT id FROM purchase_orders WHERE id = $1 FOR UPDATE`, [payload.poId]);
    if (poResult.rowCount === 0) throw ruleError('Purchase order not found');
    await validateLines(client, payload.poId, payload.lines);

    const countResult = await client.query(`SELECT COUNT(*)::int AS total FROM goods_receipts`);
    const grId = uuidv4();
    await client.query(
      `INSERT INTO goods_receipts (id, gr_number, po_id, status, receipt_date, notes)
       VALUES ($1, $2, $3, 'DRAFT', $4, $5)`,
      [grId, createGrNumber(countResult.rows[0].total), payload.poId, payload.receiptDate || null, payload.notes || null]
    );
    for (let index = 0; index < payload.lines.length; index += 1) {
      const line = payload.lines[index];
      await client.query(
        `INSERT INTO gr_lines (id, gr_id, po_line_id, line_no, qty_received, actual_site_code)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), grId, line.poLineId, index + 1, Number(line.qtyReceived), line.actualSiteCode.trim()]
      );
    }
    await client.query('COMMIT');
    return getGoodsReceiptById(db, grId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function postGoodsReceipt(db, id) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const headerResult = await client.query(`SELECT * FROM goods_receipts WHERE id = $1 FOR UPDATE`, [id]);
    if (headerResult.rowCount === 0) { await client.query('ROLLBACK'); return null; }
    const header = headerResult.rows[0];
    if (header.status !== 'DRAFT') throw ruleError('Only DRAFT goods receipt can be posted');
    const linesResult = await client.query(`SELECT * FROM gr_lines WHERE gr_id = $1 ORDER BY line_no`, [id]);
    await validateLines(client, header.po_id, linesResult.rows.map((line) => ({ poLineId: line.po_line_id, qtyReceived: line.qty_received })), id);
    for (const line of linesResult.rows) {
      await client.query(`UPDATE po_lines SET qty_received = qty_received + $1, updated_at = NOW() WHERE id = $2`, [line.qty_received, line.po_line_id]);
    }
    await client.query(`UPDATE goods_receipts SET status = 'POSTED', updated_at = NOW() WHERE id = $1`, [id]);
    await client.query('COMMIT');
    return getGoodsReceiptById(db, id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}