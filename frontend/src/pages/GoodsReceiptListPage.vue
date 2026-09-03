<template>
  <section>
    <div class="page-header">
      <div class="page-header-left">
        <RouterLink to="/" class="back-btn" title="Back to Dashboard">&#8592;</RouterLink>
        <div>
          <h2>Goods Receipts</h2>
          <p class="muted">All goods receipt records</p>
        </div>
      </div>
      <RouterLink class="btn btn-primary" to="/goods-receipts/new">+ New GR</RouterLink>
    </div>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
    <div class="card-panel">
      <div class="list-toolbar">
        <span class="muted">{{ filteredItems.length }} receipt{{ filteredItems.length === 1 ? '' : 's' }}</span>
        <label>
          <span class="filter-label">Status</span>
          <select v-model="statusFilter">
            <option value="ALL">All</option>
            <option value="DRAFT">Draft</option>
            <option value="POSTED">Posted</option>
          </select>
        </label>
      </div>
      <div v-if="loading" class="empty-state">Loading goods receipts...</div>
      <div v-else-if="filteredItems.length === 0" class="empty-state">No goods receipts found.</div>
      <table v-else>
        <thead><tr><th>GR Number</th><th>Purchase Order</th><th>Vendor</th><th>Status</th><th>Receipt Date</th><th>Created</th></tr></thead>
        <tbody>
          <tr v-for="item in filteredItems" :key="item.id">
            <td><RouterLink :to="`/goods-receipts/${item.id}`">{{ item.grNumber }}</RouterLink></td>
            <td>{{ item.poNumber || '-' }}</td>
            <td>{{ item.vendorName || '-' }}</td>
            <td><span class="status-badge" :class="item.status.toLowerCase()">{{ item.status }}</span></td>
            <td>{{ formatDate(item.receiptDate) }}</td>
            <td>{{ formatDate(item.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../api';

const items = ref([]);
const loading = ref(false);
const errorMessage = ref('');
const statusFilter = ref('ALL');
const filteredItems = computed(() => statusFilter.value === 'ALL'
  ? items.value
  : items.value.filter((item) => item.status === statusFilter.value));
const formatDate = (value) => value ? new Date(value).toLocaleDateString() : '-';

onMounted(async () => {
  loading.value = true;
  try {
    const payload = await api.listGoodsReceipts();
    items.value = payload.items || [];
  } catch (error) {
    errorMessage.value = error.message || 'Unable to load goods receipts.';
  } finally { loading.value = false; }
});
</script>

<style scoped>
.list-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.list-toolbar label { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.filter-label { color: var(--text-muted); font-weight: 600; }
select { border: 1px solid var(--border); border-radius: var(--radius-input); padding: 8px 10px; background: var(--white); color: var(--text); }
.empty-state { padding: 32px 16px; text-align: center; color: var(--text-muted); }
</style>