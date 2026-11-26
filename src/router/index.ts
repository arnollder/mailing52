import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('../pages/HomePage.vue') },
    { path: '/schedule', name: 'schedule', component: () => import('../pages/SchedulePage.vue') },
    { path: '/flyers', name: 'flyers', component: () => import('../pages/FlyersPage.vue') },
    { path: '/urgent', name: 'urgent', component: () => import('../pages/UrgentPage.vue') },
    { path: '/channels', name: 'channels', component: () => import('../pages/ChannelsPage.vue') }
  ],
  scrollBehavior: () => ({ top: 0 })
})
