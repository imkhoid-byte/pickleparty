import { ProOnly } from '../screens/ProOnly';
import { RoundRobin } from '../screens/RoundRobin';

export default function RoundRobinRoute() {
  return (
    <ProOnly reason="roundRobin">
      <RoundRobin />
    </ProOnly>
  );
}
