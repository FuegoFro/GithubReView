import Vue from 'vue';
import Router, { Route } from 'vue-router';
import Login from './views/Login.vue';
import ListPrs from '@/views/PrOverviewList.vue';
import PrDetails from '@/views/PrDetails.vue';

Vue.use(Router);

export default new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/',
      name: 'prs_overview',
      component: ListPrs,
    },
    {
      path: '/pr/:repoOwner/:repoName/:prNumber',
      name: 'pr_details',
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
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (about.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import(/* webpackChunkName: "about" */ './views/About.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: Login,
    },
  ],
});
