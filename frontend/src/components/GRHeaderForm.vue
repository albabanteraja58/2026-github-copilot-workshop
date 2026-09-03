<template>
  <div class="gr-header-form">
    <p class="form-section-title">GR Header</p>
    <div class="form-row">
      <div class="form-group">
        <label for="gr-number">GR Number</label>
        <input id="gr-number" :value="modelValue.grNumber" disabled />
      </div>
      <div class="form-group">
        <label for="gr-po">Purchase Order <span class="required">*</span></label>
        <select id="gr-po" :value="modelValue.poId" @change="update('poId', $event.target.value)">
          <option value="">Select purchase order</option>
          <option v-for="purchaseOrder in purchaseOrders" :key="purchaseOrder.id" :value="purchaseOrder.id">
            {{ purchaseOrder.label }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label for="receipt-date">Receipt Date</label>
        <input id="receipt-date" type="date" :value="modelValue.receiptDate" @input="update('receiptDate', $event.target.value)" />
      </div>
      <div class="form-group">
        <label for="gr-status">Status</label>
        <input id="gr-status" value="DRAFT" disabled />
      </div>
    </div>
    <div class="form-group notes-group">
      <label for="gr-notes">Notes</label>
      <textarea id="gr-notes" rows="3" :value="modelValue.notes" placeholder="Add a note about this delivery" @input="update('notes', $event.target.value)" />
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Object, required: true },
  purchaseOrders: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:modelValue']);

const update = (field, value) => emit('update:modelValue', { ...props.modelValue, [field]: value });
</script>

<style scoped>
.gr-header-form { padding: 24px; }
.required { color: var(--primary); }
.notes-group { margin-top: 18px; }
textarea { width: 100%; resize: vertical; }
</style>