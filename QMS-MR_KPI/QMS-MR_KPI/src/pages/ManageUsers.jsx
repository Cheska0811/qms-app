import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import serverApi from '@/api/serverClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Pencil, Trash2, UserPlus } from 'lucide-react';

const SESSION_STORAGE_KEY = 'qms_auth_session';
const UNASSIGNED_DEPARTMENT = '__unassigned__';

function sanitizeUserEntry(user) {
  if (!user) return user;

  const {
    password: _password,
    username: _username,
    auth_token: _authToken,
    ...safeUser
  } = user;

  return safeUser;
}

function syncSessionUser(updatedUser) {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return;

    const session = JSON.parse(raw);
    if (session?.user?.id !== updatedUser.id) return;

    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        ...session,
        user: sanitizeUserEntry(updatedUser),
      })
    );
  } catch {
    // Ignore session sync issues.
  }
}

function buildUserDraft(user) {
  return {
    email: user.email || '',
    role: user.role || 'department_user',
    department_id: user.department_id || UNASSIGNED_DEPARTMENT,
  };
}

function buildUserPayload(draft, departments) {
  const departmentId = draft.department_id === UNASSIGNED_DEPARTMENT ? '' : draft.department_id;
  const department = departments.find((entry) => entry.id === departmentId);

  return {
    email: draft.email.trim(),
    role: draft.role,
    department_id: department?.id || '',
    department_name: department?.name || '',
    department_head: department?.head || '',
    full_name: department?.head || draft.email.trim(),
  };
}

function getRoleLabel(entry, currentUser) {
  if (entry.id === currentUser?.id && entry.role === 'admin') {
    return 'You (Admin)';
  }

  if (entry.id === currentUser?.id) {
    return 'You';
  }

  return entry.role || 'user';
}

export default function ManageUsers() {
  const { user: currentUser } = useOutletContext();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [saveState, setSaveState] = useState({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    role: 'department_user',
    department_id: UNASSIGNED_DEPARTMENT,
  });
  const saveTimersRef = useRef({});

  useEffect(() => {
    let active = true;

    Promise.all([
      serverApi.getUsers(),
      serverApi.entities.Department.list(),
    ]).then(([nextUsers, nextDepartments]) => {
      if (!active) return;
      setUsers((nextUsers || []).map(sanitizeUserEntry));
      setDepartments(nextDepartments || []);
      setLoading(false);
    }).catch((error) => {
      if (!active) return;
      console.error('Failed to load user management data:', error);
      toast.error(error.message || 'Failed to load users');
      setLoading(false);
    });

    return () => {
      active = false;
      Object.values(saveTimersRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const scheduleAutoSave = (userId, draft) => {
    if (saveTimersRef.current[userId]) {
      clearTimeout(saveTimersRef.current[userId]);
    }

    setSaveState((prev) => ({ ...prev, [userId]: 'pending' }));

    saveTimersRef.current[userId] = setTimeout(async () => {
      try {
        const updatedUser = sanitizeUserEntry(
          await serverApi.updateUser(userId, buildUserPayload(draft, departments))
        );

        setUsers((prev) => prev.map((entry) => (entry.id === userId ? updatedUser : entry)));
        setDrafts((prev) => ({ ...prev, [userId]: buildUserDraft(updatedUser) }));
        setSaveState((prev) => ({ ...prev, [userId]: 'saved' }));
        syncSessionUser(updatedUser);
      } catch (error) {
        console.error('Failed to save user:', error);
        setSaveState((prev) => ({ ...prev, [userId]: 'error' }));
        toast.error(error.message || 'Failed to save user');
      }
    }, 700);
  };

  const handleStartEdit = (user) => {
    setEditingId(user.id);
    setDrafts((prev) => ({ ...prev, [user.id]: buildUserDraft(user) }));
    setSaveState((prev) => ({ ...prev, [user.id]: 'idle' }));
  };

  const handleFieldChange = (userId, field, value) => {
    setDrafts((prev) => {
      const nextDraft = {
        ...(prev[userId] || buildUserDraft(users.find((entry) => entry.id === userId) || {})),
        [field]: value,
      };
      scheduleAutoSave(userId, nextDraft);
      return { ...prev, [userId]: nextDraft };
    });
  };

  const handleDeleteUser = async (entry) => {
    const confirmed = window.confirm(`Delete user ${entry.email}?`);
    if (!confirmed) return;

    try {
      await serverApi.deleteUser(entry.id);
      if (saveTimersRef.current[entry.id]) {
        clearTimeout(saveTimersRef.current[entry.id]);
      }
      setUsers((prev) => prev.filter((user) => user.id !== entry.id));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[entry.id];
        return next;
      });
      setSaveState((prev) => {
        const next = { ...prev };
        delete next[entry.id];
        return next;
      });
      if (editingId === entry.id) {
        setEditingId(null);
      }
      toast.success('User deleted');
    } catch (error) {
      toast.error(
        error.message?.includes('404')
          ? 'Delete endpoint not found. Restart the backend server and try again.'
          : (error.message || 'Failed to delete user')
      );
    }
  };

  const handleCreateUser = async () => {
    try {
      const department = departments.find(
        (entry) => entry.id === (createForm.department_id === UNASSIGNED_DEPARTMENT ? '' : createForm.department_id)
      );

      const created = sanitizeUserEntry(await serverApi.register({
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
        department_id: department?.id || '',
        department_name: department?.name || '',
        department_head: department?.head || '',
        full_name: department?.head || createForm.email.trim(),
        username: createForm.email.trim(),
      }));

      setUsers((prev) => [...prev, created]);
      setCreateDialogOpen(false);
      setCreateForm({
        email: '',
        password: '',
        role: 'department_user',
        department_id: UNASSIGNED_DEPARTMENT,
      });
      toast.success('User created');
    } catch (error) {
      toast.error(error.message || 'Failed to create user');
    }
  };

  if (currentUser?.role !== 'admin') {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Admin access required.</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage accounts and department assignments</p>
          <p className="text-xs text-primary mt-2 font-medium">
            Signed in as {currentUser?.email || currentUser?.full_name || 'admin'} ({currentUser?.role || 'user'})
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Password</Label>
                <Input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Role</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(value) => setCreateForm((prev) => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="department_user">Department User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Department</Label>
                <Select
                  value={createForm.department_id}
                  onValueChange={(value) => setCreateForm((prev) => ({ ...prev, department_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_DEPARTMENT}>No department</SelectItem>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {createForm.department_id !== UNASSIGNED_DEPARTMENT && (
                <p className="text-xs text-muted-foreground">
                  Head: {departments.find((entry) => entry.id === createForm.department_id)?.head || '-'}
                </p>
              )}
              <Button
                onClick={handleCreateUser}
                className="w-full"
                disabled={
                  !createForm.email.trim() ||
                  !createForm.password ||
                  (createForm.role !== 'admin' && createForm.department_id === UNASSIGNED_DEPARTMENT)
                }
              >
                Save User
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2 pr-4 font-medium text-xs">Department Head</th>
                <th className="text-left py-2 px-4 font-medium text-xs">Email</th>
                <th className="text-left py-2 px-4 font-medium text-xs">Role</th>
                <th className="text-left py-2 px-4 font-medium text-xs">Department</th>
                <th className="text-right py-2 pl-4 font-medium text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((entry) => {
                const isEditing = editingId === entry.id;
                const draft = drafts[entry.id] || buildUserDraft(entry);
                const department = departments.find(
                  (departmentEntry) => departmentEntry.id === (draft.department_id === UNASSIGNED_DEPARTMENT ? '' : draft.department_id)
                );

                return (
                  <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors align-top">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground">
                          {(entry.full_name || entry.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                         <div className="text-sm font-medium">{department?.head || entry.department_head || (entry.role === 'admin' ? 'Admin' : 'Unassigned')}</div>
                          {isEditing && (
                            <div className="text-[10px] text-muted-foreground mt-1">
                              {saveState[entry.id] === 'pending' && 'Saving...'}
                              {saveState[entry.id] === 'saved' && 'Saved'}
                              {saveState[entry.id] === 'error' && 'Save failed'}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <Input
                          value={draft.email}
                          onChange={(e) => handleFieldChange(entry.id, 'email', e.target.value)}
                          className="h-8 min-w-[220px]"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">{entry.email}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <Select value={draft.role} onValueChange={(value) => handleFieldChange(entry.id, 'role', value)}>
                          <SelectTrigger className="h-8 min-w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="department_user">Department User</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          entry.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground'
                        }`}>
                          {getRoleLabel(entry, currentUser)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <div className="space-y-1">
                          <Select
                            value={draft.department_id}
                            onValueChange={(value) => handleFieldChange(entry.id, 'department_id', value)}
                          >
                            <SelectTrigger className="h-8 min-w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={UNASSIGNED_DEPARTMENT}>No department</SelectItem>
                              {departments.map((departmentEntry) => (
                                <SelectItem key={departmentEntry.id} value={departmentEntry.id}>
                                  {departmentEntry.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] text-muted-foreground">
                            {department ? `Head: ${department.head || '-'}` : 'Not assigned to a department'}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs">{entry.department_name || '-'}</span>
                      )}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => (isEditing ? setEditingId(null) : handleStartEdit(entry))}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={() => handleDeleteUser(entry)}
                          disabled={currentUser?.id === entry.id}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
