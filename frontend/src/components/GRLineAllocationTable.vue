<template>
  <div class="gr-line-table">
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Line</th><th>Item</th><th>Ordered</th><th>Received</th><th>Open Qty</th>
            <th>Receive Now</th><th>UOM</th><th>Actual Site</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(line, index) in lines" :key="line.id" data-testid="gr-line-row">
            <td>{{ line.lineNo }}</td>
            <td><strong>{{ line.itemName }}</strong><small>{{ line.itemCode }}</small></td>
            <td>{{ line.qtyOrdered }}</td>
            <td>{{ line.qtyReceived }}</td>
            <td>{{ openQuantity(line) }}</td>
            <td>
              <input v-model.number="line.receiveNow" class="mini-input" type="number" min="0" :max="openQuantity(line)" aria-label="Receive quantity" @input="validateLine(index)" />
              <span v-if="lineErrors[index]" class="field-error">{{ lineErrors[index] }}</span>
            </td>
            <td>{{ line.uom }}</td>
            <td><input v-model="line.actualSiteCode" class="mini-input site-input" type="text" aria-label="Actual site" /></td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="lines.length === 0" class="empty-state">Select a purchase order to view open lines.</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({ lines: { type: Array, default: () => [] } });
const lineErrors = ref([]);

const openQuantity = (line) => Math.max(Number(line.qtyOrdered) - Number(line.qtyReceived), 0);
const validateLine = (index) => {
  const line = props.lines[index];
  const quantity = Number(line.receiveNow);
  lineErrors.value[index] = !Number.isFinite(quantity) || quantity < 0 || quantity > openQuantity(line)
    ? `Must be between 0 and ${openQuantity(line)}`
    : '';
};

defineExpose({
  validate: () => props.lines.every((line, index) => { validateLine(index); return !lineErrors.value[index]; }),
});
</script>

<style scoped>
.gr-line-table { padding: 0 10px 10px; }
.table-scroll { overflow-x: auto; }
table { min-width: 850px; }
td strong, td small { display: block; }
td small { color: var(--text-muted); font-size: 11px; margin-top: 3px; }
.mini-input { width: 100px; height: 34px; border: 1px solid var(--border); border-radius: var(--radius-input); background: var(--white); color: var(--text); padding: 0 8px; font: inherit; }
.site-input { width: 120px; }
.field-error { display: block; color: #b42318; font-size: 11px; margin-top: 4px; white-space: nowrap; }
.empty-state { padding: 32px; text-align: center; color: var(--text-muted); }
</style>