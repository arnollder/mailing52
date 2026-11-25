<script setup lang="ts">
useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: { lang: 'ru' }
})

useSeoMeta({
  title: 'Digital М52 — рассылка',
  description: 'Рабочий стол оператора рассылки комитета Digital АН М52'
})

const colorMode = useColorMode()
colorMode.preference = 'dark'
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
