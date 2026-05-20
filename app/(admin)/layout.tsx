import { requireAdminPage } from "@/lib/admin/require-admin"
import { AdminSidebar } from "@/components/admin/AdminSidebar"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Hard gate — redirects to /login if not authenticated or not is_admin
  await requireAdminPage()

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-white">
      <AdminSidebar />
      <main className="flex flex-1 flex-col overflow-auto">
        {children}
      </main>
    </div>
  )
}
