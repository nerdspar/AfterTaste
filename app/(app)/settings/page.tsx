import { loadHousehold } from '@/app/(app)/household-actions';
import { SettingsClient } from './SettingsClient';

export default async function SettingsPage() {
  // Load the household view on the server so the client component is seeded
  // (no mount-time fetch race).
  const householdView = await loadHousehold();
  return <SettingsClient householdView={householdView} />;
}
