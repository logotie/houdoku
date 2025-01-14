import React from 'react';
import { Provider } from 'react-redux';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import { configuredStore } from './store';
import routes from './constants/routes.json';
import DashboardPage from './components/general/DashboardPage';
import ReaderPage from './components/reader/ReaderPage';

const store = configuredStore();

export default function App() {
  return (
    <Provider store={store}>
      <Router>
        <Switch>
          <Route
            path={`${routes.READER}/:chapter_id`}
            exact
            component={ReaderPage}
          />
          <Route path={routes.SERIES} component={DashboardPage} />
          <Route path={routes.SEARCH} component={DashboardPage} />
          <Route path={routes.SETTINGS} component={DashboardPage} />
          <Route path={routes.LIBRARY} component={DashboardPage} />
        </Switch>
      </Router>
    </Provider>
  );
}
