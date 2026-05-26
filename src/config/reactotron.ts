import Reactotron from 'reactotron-react-native';
import { QueryClientManager, reactotronReactQuery } from 'reactotron-react-query';
import { queryClient } from '../services/queryClient';

const queryClientManager = new QueryClientManager({ queryClient });

Reactotron.configure({ name: 'Modo' })
  .useReactNative()
  .use(reactotronReactQuery(queryClientManager))
  .connect();

export default Reactotron;
