import React, { Component } from 'react';
import { Route, Switch } from 'react-router-dom';
import CacheRoute, { CacheSwitch } from 'react-router-cache-route';
import Nomatch from '@choerodon/master/lib/containers/components/c7n/tools/error-pages/404';
import asyncRouter from '../{{ source }}/containers/components/util/asyncRouter';

const routes = {};

function createRoute(path, component, moduleCode) {
  if (!routes[path]) {
    routes[path] = <Route path={path} component={asyncRouter(component)} />;
  }
  return routes[path];
}

function createHome(path, component, homePath) {
  if (!routes[path]) {
    const Cmp = asyncRouter(
      // eslint-disable-next-line no-nested-ternary
      homePath
        ? component
        : () => import('../{{ source }}/containers/components/home'),
    );
    routes[path] = <Route exact path={path} component={Cmp} />;
  }
  return routes[path];
}

const AutoRouter = () => (
  <CacheSwitch>
    {'{{ home }}'}
    {'{{ routes }}'}
    <CacheRoute path="*" component={Nomatch} />
  </CacheSwitch>
);

export default AutoRouter;
