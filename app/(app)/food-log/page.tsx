import { FoodLogClient } from '@/components/aftertaste/food-log/FoodLogClient';

// The diary is fully client-driven: it loads the selected day via a server
// action, reads goals from the user context, and recipes from the store.
export default function FoodLogPage() {
  return <FoodLogClient />;
}
