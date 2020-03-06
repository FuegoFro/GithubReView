import Vue from 'vue';
import Router, { Route } from 'vue-router';
import Login from './views/Login.vue';
import ListPrs from '@/views/PrOverviewList.vue';
import PrDetails from '@/views/PrDetails.vue';

Vue.use(Router);

const router = new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/',
      name: 'prsOverview',
      component: ListPrs,
      meta: {
        title: 'PRs',
      },
    },
    {
      path: '/pr/:repoOwner/:repoName/:prNumber',
      name: 'prDetails',
      component: PrDetails,
      props: (route: Route) => {
        const params: { [key: string]: any } = route.params;
        if (typeof params.prNumber === 'string') {
          params.prNumber = Number.parseFloat(params.prNumber);
        }
        return params;
      },
      meta: {
        title: 'Details',
      },
    },
    {
      path: '/login',
      name: 'login',
      component: Login,
      meta: {
        title: 'Login',
      },
    },
    {
      path: '/test',
      name: 'prDetailsTest',
      component: PrDetails,
      props: (route: Route) => {
        return { repoOwner: 'test-owner', repoName: 'test-repo', prNumber: 123 };
      },
      meta: {
        title: 'Test Details',
      },
    },
  ],
});

router.beforeEach((to, from, next) => {
  document.title = to.meta.title || 'GithubReView';
  if (!localStorage.token && to.name !== 'login') {
    next('login');
  } else {
    next();
  }
});

export default router;
