import { NextResponse } from 'next/server';
import { loadHousehold } from '@/app/(app)/household-actions';

// Initial household view for the settings page. Fetched with a plain GET on
// mount (server actions invoked during mount/hydration can hang under the dev
// server); mutations still go through server actions.
export async function GET() {
  const view = await loadHousehold();
  return NextResponse.json(view);
}
