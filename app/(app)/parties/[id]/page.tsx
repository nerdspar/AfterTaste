import { notFound } from 'next/navigation';
import { loadParty } from '@/app/(app)/party-actions';
import { PartyClient } from '@/components/aftertaste/party/PartyClient';

export default async function PartyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const party = await loadParty(id);
  if (!party) notFound();
  return <PartyClient initial={party} />;
}
