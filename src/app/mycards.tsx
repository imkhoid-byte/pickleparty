import { MyCards } from '../screens/MyCards';
import { ProOnly } from '../screens/ProOnly';

export default function MyCardsRoute() {
  return (
    <ProOnly reason="customCards">
      <MyCards />
    </ProOnly>
  );
}
