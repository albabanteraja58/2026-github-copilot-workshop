<template>
  <section class="goods-receipt-page">
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/goods-receipts" class="back-btn" aria-label="Back to goods receipts">&#8592;</RouterLink>
        <div>
          <h2>New Goods Receipt</h2>
          <p class="muted">Record received quantities against a purchase order</p>
        </div>
      </div>
      <span class="status-badge draft">{{ receiptStatus }}</span>
    </div>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
    <p v-if="loading" class="loading-message">Loading purchase orders...</p>
    <section class="card-panel"><GRHeaderForm v-model="form" :purchase-orders="purchaseOrders" /></section>

    <section class="card-panel">
      <div class="section-heading">
        <p class="form-section-title">Receipt Lines</p>
        <span class="muted">{{ selectedLineCount }} lines</span>
      </div>
      <GRLineAllocationTable ref="lineTable" :lines="lines" />
    </section>

    <div class="form-footer">
      <span class="muted">Draft only. API integration will be added later.</span>
      <div class="actions">
        <RouterLink to="/goods-receipts" class="btn btn-outline">Cancel</RouterLink>
        <button type="button" class="btn btn-outline" :disabled="saving" @click="saveDraft">{{ saving ? 'Saving...' : 'Save As Draft' }}</button>
        <button type="button" class="btn btn-primary" :disabled="saving || receiptStatus === 'POSTED'" @click="postReceipt">{{ saving ? 'Posting...' : 'Post GR' }}</button>
      </div>
    </div>
    <p v-if="message" class="success-message" role="status">{{ message }}</p>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import GRHeaderForm from '../components/GRHeaderForm.vue';
import GRLineAllocationTable from '../components/GRLineAllocationTable.vue';
import { api } from '../api';

const lineTable = ref(null);
const message = ref('');
const form = ref({ grNumber: '', poId: '', receiptDate: '', notes: '' });
const purchaseOrders = ref([]);
const lines = ref([]);
const receiptId = ref('');
const receiptStatus = ref('DRAFT');
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref('');
const selectedLineCount = computed(() => lines.value.length);
const loadOpenLines = async (poId) => {
  lines.value = [];
  if (!poId) return;
  loading.value = true;
  errorMessage.value = '';
  try {
    const payload = await api.getPurchaseOrderOpenLines(poId);
    lines.value = (payload.openLines || []).map((line) => ({
      ...line,
      receiveNow: 0,
      actualSiteCode: line.siteCode || '',
    }));
  } catch (error) {
    errorMessage.value = error.message || 'Unable to load purchase order lines.';
  } finally { loading.value = false; }
};
const buildPayload = () => ({
  poId: form.value.poId,
  receiptDate: form.value.receiptDate || undefined,
  notes: form.value.notes || undefined,
  lines: lines.value.filter((line) => Number(line.receiveNow) > 0).map((line) => ({ poLineId: line.id, qtyReceived: Number(line.receiveNow), actualSiteCode: line.actualSiteCode })),
});
const saveDraft = async () => {
  errorMessage.value = '';
  message.value = '';
  if (!form.value.poId) { errorMessage.value = 'Purchase order is required.'; return null; }
  if (!lines.value.some((line) => Number(line.receiveNow) > 0)) { errorMessage.value = 'Enter a receive quantity for at least one line.'; return null; }
  if (!lineTable.value?.validate()) { errorMessage.value = 'Please fix receipt quantities.'; return null; }
  saving.value = true;
  try {
    const receipt = await api.createGoodsReceipt(buildPayload());
    receiptId.value = receipt.id;
    form.value.grNumber = receipt.grNumber;
    receiptStatus.value = receipt.status;
    message.value = 'Goods receipt draft saved.';
    return receipt;
  } catch (error) {
    errorMessage.value = error.message || 'Unable to save goods receipt.';
    return null;
  } finally { saving.value = false; }
};
const postReceipt = async () => {
  const draft = receiptId.value ? { id: receiptId.value } : await saveDraft();
  if (!draft) return;
  saving.value = true;
  errorMessage.value = '';
  try {
    const receipt = await api.postGoodsReceipt(draft.id);
    receiptStatus.value = receipt.status;
    message.value = 'Goods receipt posted.';
  } catch (error) {
    errorMessage.value = error.message || 'Unable to post goods receipt.';
  } finally { saving.value = false; }
};

watch(() => form.value.poId, loadOpenLines);
onMounted(async () => {
  loading.value = true;
  try {
    const payload = await api.listPurchaseOrders();
    purchaseOrders.value = (payload.items || []).map((purchaseOrder) => ({
      id: purchaseOrder.id,
      label: `${purchaseOrder.poNumber} - ${purchaseOrder.vendorName}`,
    }));
    if (purchaseOrders.value.length > 0) form.value.poId = purchaseOrders.value[0].id;
  } catch (error) {
    errorMessage.value = error.message || 'Unable to load purchase orders.';
  } finally { loading.value = false; }
});
</script>

<style scoped>
.goods-receipt-page { max-width: 1180px; margin: 0 auto; }
.section-heading { display: flex; align-items: center; justify-content: space-between; }
.form-footer { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-top: 8px; }
.actions { display: flex; gap: 10px; }
.success-message { color: #137333; margin-top: 16px; }
@media (max-width: 720px) { .form-footer { align-items: flex-start; flex-direction: column; } .actions { width: 100%; } .actions .btn { flex: 1; } }
</style>