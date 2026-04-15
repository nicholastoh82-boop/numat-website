'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Leaf, LogOut, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAdminRole } from '@/app/admin/layout'

export default function AdminHeader() {
  const router = useRouter()
  const { role, name } = useAdminRole()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <Link href={role === 'rep' ? '/admin/leads' : '/admin'} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Leaf className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-serif text-xl text-foreground">NUMAT</span>
          </Link>
          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded font-medium">
            {role === 'rep' ? 'Sales Rep' : 'Admin'}
          </span>
          {name && (
            <span className="hidden sm:inline text-xs text-muted-foreground">
              {name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {role === 'admin' && (
            <Link href="/" target="_blank">
              <Button variant="ghost" size="sm" className="gap-2">
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">View Site</span>
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  )
}