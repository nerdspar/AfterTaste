import { listParties } from '@/app/(app)/party-actions';
import { PartiesClient } from '@/components/aftertaste/party/PartiesClient';

export default async function PartiesPage() {
  // Server-seeded, like every other list in the app — no mount-time fetch.
  const parties = await listParties();
  return <PartiesClient parties={parties} />;
}
