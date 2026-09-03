<template>
  <section>
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/goods-receipts" class="back-btn" title="Back to goods receipts">&#8592;</RouterLink>
        <div>
          <h2>Goods Receipt Detail</h2>
          <p class="muted">{{ receipt?.grNumber || '-' }} - Goods receipt information detail</p>
        </div>
      </div>
      <button v-if="receipt?.status === 'DRAFT'" type="button" class="btn btn-primary" :disabled="posting" @click="postReceipt">
        {{ posting ? 'Posting...' : 'Post GR' }}
      </button>
    </div>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
    <div v-if="loading" class="card-panel empty-state">Loading goods receipt...</div>
    <template v-else-if="receipt">
      <div class="card-panel">
        <p class="form-section-title">GR Header</p>
        <div class="form-row">
          <div class="form-group"><label>GR Number</label><input :value="receipt.grNumber" disabled /></div>
          <div class="form-group"><label>Purchase Order</label><input :value="receipt.poNumber || receipt.poId" disabled /></div>
          <div class="form-group"><label>Status</label><span class="status-badge" :class="receipt.status.toLowerCase()">{{ receipt.status }}</span></div>
          <div class="form-group"><label>Receipt Date</label><input :value="formatDate(receipt.receiptDate)" disabled /></div>
        </div>
        <div v-if="receipt.notes" class="notes"><label>Notes</label><p>{{ receipt.notes }}</p></div>
      </div>

      <div class="card-panel">
        <p class="form-section-title">Receipt Lines</p>
        <div v-if="receipt.lines.length === 0" class="empty-state">This goods receipt has no lines.</div>
        <table v-else>
          <thead><tr><th>Line</th><th>Item</th><th>Item Code</th><th>Qty Received</th><th>Actual Site</th></tr></thead>
          <tbody><tr v-for="line in receipt.lines" :key="line.id">
            <td>{{ line.lineNo }}</td><td>{{ line.itemName }}</td><td>{{ line.itemCode }}</td><td>{{ line.qtyReceived }}</td><td>{{ line.actualSiteCode }}</td>
          </tr></tbody>
        </table>
      </div>
    </template>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { api } from '../api';

const route = useRoute();
const receipt = ref(null);
const loading = ref(false);
const posting = ref(false);
const errorMessage = ref('');
const formatDate = (value) => value ? new Date(value).toLocaleDateString() : '-';

const load = async () => {
  loading.value = true;
  try { receipt.value = await api.getGoodsReceipt(route.params.id); }
  catch (error) { errorMessage.value = error.message || 'Unable to load goods receipt.'; }
  finally { loading.value = false; }
};
const postReceipt = async () => {
  posting.value = true;
  errorMessage.value = '';
  try { receipt.value = await api.postGoodsReceipt(route.params.id); }
  catch (error) { errorMessage.value = error.message || 'Unable to post goods receipt.'; }
  finally { posting.value = false; }
};

onMounted(load);
</script>

<style scoped>
.form-group input:disabled { background: var(--white); color: var(--text); cursor: default; opacity: 1; }
.notes { margin-top: 18px; }
.notes label { display: block; font-weight: 600; font-size: 13px; }
.notes p { margin: 6px 0 0; color: var(--text-muted); }
.empty-state { padding: 32px 16px; text-align: center; color: var(--text-muted); }
</style>