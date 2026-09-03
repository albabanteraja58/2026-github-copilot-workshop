import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, test } from 'vitest';
import { createRouter, createWebHistory } from 'vue-router';
import App from '../src/App.vue';

const createTestRouter = () => createRouter({
  history: createWebHistory(),
  routes: [{ path: '/', component: { template: '<div />' } }],
});

describe('App dark mode', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark-mode');
  });

  test('toggles dark mode and persists the preference', async () => {
    const wrapper = mount(App, {
      global: { plugins: [createTestRouter()] },
    });
    await wrapper.vm.$nextTick();

    const toggle = wrapper.find('.theme-toggle');
    expect(toggle.attributes('aria-pressed')).toBe('false');

    await toggle.trigger('click');

    expect(toggle.attributes('aria-pressed')).toBe('true');
    expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});
