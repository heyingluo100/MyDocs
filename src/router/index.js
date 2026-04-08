import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue')
  },
  {
    path: '/tag/:tag',
    name: 'tag',
    component: () => import('../views/HomeView.vue')
  },
  {
    path: '/article/:slug',
    name: 'article',
    component: () => import('../views/ArticleView.vue')
  },
  {
    path: '/collection/:slug',
    name: 'collection',
    component: () => import('../views/CollectionView.vue')
  },
  {
    path: '/file/:filename',
    name: 'file',
    component: () => import('../views/FileView.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  // 滚动恢复由 App.vue 的 Transition @enter 钩子处理
  scrollBehavior() {
    return false
  }
})

export default router
