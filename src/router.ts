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
    },
    {
      path: '/login',
      name: 'login',
      component: Login,
    },
  ],
});

router.beforeEach((to, from, next) => {
  if (!localStorage.token && to.name !== 'login') {
    next('login');
  } else {
    next();
  }
});

export default router;
