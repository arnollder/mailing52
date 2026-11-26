<script setup lang="ts">
import AppLayout from './layouts/AppLayout.vue'
import ToastHost from './components/ToastHost.vue'
</script>

<template>
  <AppLayout>
    <RouterView />
  </AppLayout>
  <ToastHost />
</template>
