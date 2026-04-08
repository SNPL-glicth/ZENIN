import { AppRouter } from './router/AppRouter';

/**
 * App - Root application component.
 *
 * Delegates all routing to AppRouter.
 * Keeps root component minimal and focused.
 */
function App(): React.ReactElement {
  return <AppRouter />;
}

export default App;
