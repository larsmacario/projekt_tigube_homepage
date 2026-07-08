'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { getCurrentUser } from '@/lib/auth'
import { Trash2, Edit2, UserPlus, Mail, ShieldAlert, Loader2 } from 'lucide-react'

interface AdminUser {
  id: string
  email: string
  vorname: string | null
  nachname: string | null
  role: 'admin'
  created_at: string
}

interface AdminInvite {
  id: string
  email: string
  vorname: string
  nachname: string
  token: string
  created_at: string
  expires_at: string
  used: boolean
}

export default function AdminsManagementPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [invites, setInvites] = useState<AdminInvite[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Einladungs-State
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({ vorname: '', nachname: '', email: '' })
  const [inviteSubmitting, setInviteSubmitting] = useState(false)

  // Bearbeitungs-State
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState({ vorname: '', nachname: '' })
  const [editSubmitting, setEditSubmitting] = useState(false)

  // Lösch-State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null)
  const [deletingInvite, setDeletingInvite] = useState<AdminInvite | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  useEffect(() => {
    async function init() {
      try {
        const user = await getCurrentUser()
        setCurrentUser(user)
        await Promise.all([loadAdmins(), loadInvites()])
      } catch (err) {
        console.error('Error during init:', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  async function loadAdmins() {
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (res.ok) {
        setAdmins(data.users || [])
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      toast({
        title: 'Fehler',
        description: err.message || 'Admins konnten nicht geladen werden',
        variant: 'destructive',
      })
    }
  }

  async function loadInvites() {
    try {
      const res = await fetch('/api/admin/invites')
      const data = await res.json()
      if (res.ok) {
        setInvites(data.invites || [])
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      toast({
        title: 'Fehler',
        description: err.message || 'Einladungen konnten nicht geladen werden',
        variant: 'destructive',
      })
    }
  }

  // Einladung senden
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteForm.email || !inviteForm.vorname || !inviteForm.nachname) return

    setInviteSubmitting(true)
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      toast({
        title: 'Erfolg',
        description: 'Einladung wurde erfolgreich versendet',
      })
      setIsInviteOpen(false)
      setInviteForm({ vorname: '', nachname: '', email: '' })
      await loadInvites()
    } catch (err: any) {
      toast({
        title: 'Fehler',
        description: err.message || 'Einladung konnte nicht gesendet werden',
        variant: 'destructive',
      })
    } finally {
      setInviteSubmitting(false)
    }
  }

  // Bearbeiten vorbereiten
  const handleEditClick = (admin: AdminUser) => {
    setEditingAdmin(admin)
    setEditForm({
      vorname: admin.vorname || '',
      nachname: admin.nachname || '',
    })
    setIsEditOpen(true)
  }

  // Bearbeiten absenden
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAdmin) return

    setEditSubmitting(true)
    try {
      const res = await fetch(`/api/admin/users/${editingAdmin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      toast({
        title: 'Erfolg',
        description: 'Admin-Daten wurden aktualisiert',
      })
      setIsEditOpen(false)
      setEditingAdmin(null)
      await loadAdmins()
    } catch (err: any) {
      toast({
        title: 'Fehler',
        description: err.message || 'Daten konnten nicht aktualisiert werden',
        variant: 'destructive',
      })
    } finally {
      setEditSubmitting(false)
    }
  }

  // Löschen vorbereiten
  const handleDeleteUserClick = (admin: AdminUser) => {
    setDeletingUser(admin)
    setDeletingInvite(null)
    setIsDeleteOpen(true)
  }

  const handleDeleteInviteClick = (invite: AdminInvite) => {
    setDeletingInvite(invite)
    setDeletingUser(null)
    setIsDeleteOpen(true)
  }

  // Löschen absenden
  const handleDeleteConfirm = async () => {
    setDeleteSubmitting(true)
    try {
      if (deletingUser) {
        const res = await fetch(`/api/admin/users/${deletingUser.id}`, {
          method: 'DELETE',
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)

        toast({
          title: 'Erfolg',
          description: 'Administrator wurde erfolgreich gelöscht',
        })
        await loadAdmins()
      } else if (deletingInvite) {
        const res = await fetch(`/api/admin/invites/${deletingInvite.id}`, {
          method: 'DELETE',
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)

        toast({
          title: 'Erfolg',
          description: 'Einladung wurde storniert',
        })
        await loadInvites()
      }
      setIsDeleteOpen(false)
      setDeletingUser(null)
      setDeletingInvite(null)
    } catch (err: any) {
      toast({
        title: 'Fehler',
        description: err.message || 'Löschvorgang ist fehlgeschlagen',
        variant: 'destructive',
      })
    } finally {
      setDeleteSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-sage-900">Admin-Verwaltung</h1>
          <p className="mt-2 text-sage-600">
            Verwalten Sie Ihre Administratoren und laden Sie neue Teammitglieder ein.
          </p>
        </div>
        <Button onClick={() => setIsInviteOpen(true)} className="bg-sage-600 hover:bg-sage-700">
          <UserPlus className="mr-2 h-4 w-4" /> Admin einladen
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Registrierte Admins */}
        <Card className="border-sage-200">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-sage-900">Aktive Administratoren</CardTitle>
            <CardDescription>
              Diese Benutzer haben vollen Zugriff auf das System.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-sage-200">
                <thead>
                  <tr className="bg-sage-50 text-left text-xs font-semibold text-sage-700 uppercase tracking-wider">
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">E-Mail</th>
                    <th className="px-6 py-3">Rolle</th>
                    <th className="px-6 py-3 text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage-200 bg-white text-sm text-sage-800">
                  {admins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-sage-50/50">
                      <td className="px-6 py-4 font-medium text-sage-900">
                        {admin.vorname || admin.nachname 
                          ? `${admin.vorname || ''} ${admin.nachname || ''}`.trim()
                          : '—'}
                      </td>
                      <td className="px-6 py-4">{admin.email}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {admin.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(admin)}
                          className="text-sage-600 hover:text-sage-900 hover:bg-sage-100"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={admin.id === currentUser?.id || admins.length <= 1}
                          onClick={() => handleDeleteUserClick(admin)}
                          className="text-red-600 hover:text-red-900 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Offene Einladungen */}
        <Card className="border-sage-200">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-sage-900">Ausstehende Einladungen</CardTitle>
            <CardDescription>
              Eingeladene Admins, die ihr Konto noch nicht eingerichtet haben.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invites.filter(i => !i.used).length === 0 ? (
              <p className="text-sm text-sage-500 text-center py-4">Keine ausstehenden Einladungen</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-sage-200">
                  <thead>
                    <tr className="bg-sage-50 text-left text-xs font-semibold text-sage-700 uppercase tracking-wider">
                      <th className="px-6 py-3">Name</th>
                      <th className="px-6 py-3">E-Mail</th>
                      <th className="px-6 py-3">Eingeladen am</th>
                      <th className="px-6 py-3 text-right">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sage-200 bg-white text-sm text-sage-800">
                    {invites.filter(i => !i.used).map((invite) => {
                      const isExpired = new Date(invite.expires_at).getTime() <= Date.now()
                      return (
                        <tr key={invite.id} className="hover:bg-sage-50/50">
                          <td className="px-6 py-4 font-medium text-sage-900">
                            {invite.vorname} {invite.nachname}
                          </td>
                          <td className="px-6 py-4">{invite.email}</td>
                          <td className="px-6 py-4">
                            {new Date(invite.created_at).toLocaleDateString('de-DE')}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            {isExpired && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mr-2">
                                Abgelaufen
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteInviteClick(invite)}
                              className="text-red-600 hover:text-red-900 hover:bg-red-50"
                            >
                              Stornieren
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invite Admin Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Admin einladen</DialogTitle>
            <DialogDescription>
              Geben Sie die E-Mail-Adresse und den Namen der Person ein, die Sie als Administrator einladen möchten.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invite-vorname">Vorname</Label>
                <Input
                  id="invite-vorname"
                  value={inviteForm.vorname}
                  onChange={(e) => setInviteForm({ ...inviteForm, vorname: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-nachname">Nachname</Label>
                <Input
                  id="invite-nachname"
                  value={inviteForm.nachname}
                  onChange={(e) => setInviteForm({ ...inviteForm, nachname: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email">E-Mail-Adresse</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="beispiel@tierischgutbetreut.de"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)} disabled={inviteSubmitting}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={inviteSubmitting} className="bg-sage-600 hover:bg-sage-700">
                {inviteSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                Einladung senden
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Admin bearbeiten</DialogTitle>
            <DialogDescription>
              Aktualisieren Sie die Profildaten des Administrators.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-vorname">Vorname</Label>
              <Input
                id="edit-vorname"
                value={editForm.vorname}
                onChange={(e) => setEditForm({ ...editForm, vorname: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-nachname">Nachname</Label>
              <Input
                id="edit-nachname"
                value={editForm.nachname}
                onChange={(e) => setEditForm({ ...editForm, nachname: e.target.value })}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={editSubmitting}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={editSubmitting} className="bg-sage-600 hover:bg-sage-700">
                {editSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Speichern
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <ShieldAlert className="h-5 w-5 mr-2" />
              Sicherheitsabfrage
            </DialogTitle>
            <DialogDescription>
              {deletingUser && (
                <>
                  Sind Sie sicher, dass Sie den Administrator <strong>{deletingUser.vorname} {deletingUser.nachname}</strong> ({deletingUser.email}) löschen möchten? 
                  Dieser Vorgang kann nicht rückgängig gemacht werden und entzieht dem Benutzer sofort jeglichen Zugriff auf das System.
                </>
              )}
              {deletingInvite && (
                <>
                  Sind Sie sicher, dass Sie die Einladung für <strong>{deletingInvite.vorname} {deletingInvite.nachname}</strong> ({deletingInvite.email}) stornieren möchten? 
                  Der versendete Link wird dadurch sofort ungültig.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={deleteSubmitting}>
              Abbrechen
            </Button>
            <Button type="button" onClick={handleDeleteConfirm} disabled={deleteSubmitting} className="bg-red-600 hover:bg-red-700 text-white">
              {deleteSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Ja, löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
