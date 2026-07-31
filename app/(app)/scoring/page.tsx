import { redirect } from 'next/navigation';

// Scoring was merged into the tabbed Insights page.
export default function ScoringPage() {
  redirect('/insights');
}
