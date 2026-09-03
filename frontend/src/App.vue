<template>
  <div class="layout">
    <header class="navbar">
      <span class="navbar-brand">Procurement MVP</span>
      <nav>
        <RouterLink to="/" :class="{ active: isDashboard }">Dashboard</RouterLink>
        <RouterLink to="/requisitions" :class="{ active: isRequisitions }">Purchase Requisitions</RouterLink>
        <RouterLink to="/purchase-orders" :class="{ active: isPurchaseOrders }">Purchase Orders</RouterLink>
      </nav>
      <button
        class="theme-toggle"
        type="button"
        :aria-pressed="isDarkMode"
        :aria-label="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="toggleDarkMode"
      >
        {{ isDarkMode ? 'Light mode' : 'Dark mode' }}
      </button>
    </header>

    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';

const route = useRoute();
const isDarkMode = ref(false);
const isDashboard = computed(() => route.path === '/');
const isRequisitions = computed(() => route.path.startsWith('/requisitions'));
const isPurchaseOrders = computed(() => route.path.startsWith('/po') || route.path.startsWith('/purchase-orders'));

const applyTheme = () => {
  document.documentElement.classList.toggle('dark-mode', isDarkMode.value);
};

onMounted(() => {
  isDarkMode.value = localStorage.getItem('theme') === 'dark';
  applyTheme();
});

const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value;
  localStorage.setItem('theme', isDarkMode.value ? 'dark' : 'light');
  applyTheme();
};
</script>
