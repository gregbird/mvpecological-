import { redirect } from 'next/navigation'

export default function DashboardRootPage() {
  // Assessor için dashboard gereksiz, direkt projelere yönlendir
  redirect('/projects')
}
