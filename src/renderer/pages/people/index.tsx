import { Placeholder } from '@/app/Placeholder'

/** Platzhalter (AP-04); wird vom Fachpaket ersetzt. */
export function PeoplePage() {
  return <Placeholder titleKey="people" />
}

/** Platzhalter für die Detailseite `/people/:id`. */
export function PersonDetailPage() {
  return <Placeholder titleKey="person" />
}
