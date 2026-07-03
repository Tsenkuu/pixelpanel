import { createRouter, createWebHistory } from 'vue-router'
// DashboardView is now lazy loaded

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/apps',
      name: 'apps',
      component: () => import('../views/AppsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/apps/:id',
      name: 'app-details',
      component: () => import('../views/AppDetailsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/apps/:id/ide',
      name: 'app-ide',
      component: () => import('../views/IdeView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { guest: true }
    },
    {
      path: '/marketplace',
      name: 'marketplace',
      component: () => import('../views/MarketplaceView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/monitoring',
      name: 'monitoring',
      component: () => import('../views/MonitoringView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/cluster',
      name: 'cluster',
      component: () => import('../views/ClusterView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/databases',
      name: 'databases',
      component: () => import('../views/DatabasesView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/cluster/:nodeId',
      name: 'node-details',
      component: () => import('../views/NodeDetailView.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

// Navigation guards
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('pixelpanel_token')
  
  if (to.meta.requiresAuth && !token) {
    next({ name: 'login' })
  } else if (to.meta.guest && token) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router
