import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import serverApi from '@/api/serverClient';
const localApi = serverApi;
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Building2, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Departments() {
  const { user } = useOutletContext();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', description: '', head: '' });
  const [editingId, setEditingId] = useState(null); // For inline editing
  const [inlineForm, setInlineForm] = useState({ name: '', code: '', description: '', head: '' });
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    localApi.entities.Department.list().then((data) => {
      setDepartments(data);
      setLoading(false);
    });
  }, []);

  // Auto-save function with debouncing
  const autoSave = (deptId, updates) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await localApi.entities.Department.update(deptId, { ...updates, status: 'active' });
        // Update local state to reflect saved changes
        setDepartments((prev) =>
          prev.map((d) => (d.id === deptId ? { ...d, ...updates, status: 'active' } : d))
        );
      } catch (error) {
        console.error('Auto-save failed:', error);
        toast.error('Failed to save changes');
      }
    }, 800); // 800ms debounce
  };

  const handleSave = async () => {
    if (editingDept) {
      await localApi.entities.Department.update(editingDept.id, { ...form, status: 'active' });
      setDepartments((prev) => prev.map((d) => d.id === editingDept.id ? { ...d, ...form, status: 'active' } : d));
      toast.success('Department updated');
    } else {
      const created = await localApi.entities.Department.create({ ...form, status: 'active' });
      setDepartments((prev) => [...prev, created]);
      toast.success('Department created');
    }
    setDialogOpen(false);
    setEditingDept(null);
    setForm({ name: '', code: '', description: '', head: '' });
  };

  const handleEdit = (dept) => {
    setEditingDept(dept);
    setForm({ name: dept.name, code: dept.code, description: dept.description || '', head: dept.head || '' });
    setDialogOpen(true);
  };

  const handleStartInlineEdit = (dept) => {
    setEditingId(dept.id);
    setInlineForm({ name: dept.name, code: dept.code, description: dept.description || '', head: dept.head || '' });
  };

  const handleCancelInlineEdit = () => {
    setEditingId(null);
    setInlineForm({ name: '', code: '', description: '', head: '' });
  };

  const handleInlineFieldChange = (field, value, deptId) => {
    setInlineForm((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-save on change
      autoSave(deptId, updated);
      return updated;
    });
  };

  const handleDelete = async (id) => {
    await localApi.entities.Department.delete(id);
    setDepartments((prev) => prev.filter((d) => d.id !== id));
    toast.success('Department deleted');
  };

  if (user?.role !== 'admin') {
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
          <h1 className="text-2xl font-bold tracking-tight">Departments</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage organization departments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingDept(null); setForm({ name: '', code: '', description: '', head: '' }); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />Add Department</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDept ? 'Edit Department' : 'New Department'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sales" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. SALES" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Department Head</Label>
                <Input value={form.head} onChange={(e) => setForm({ ...form, head: e.target.value })} placeholder="Full name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <Button onClick={handleSave} className="w-full">{editingDept ? 'Update' : 'Create'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => (
          <div
            key={dept.id}
            className="bg-card rounded-xl border border-border p-5 animate-fade-in hover:shadow-md transition-shadow"
            onMouseLeave={() => {
              if (editingId === dept.id) {
                handleCancelInlineEdit();
              }
            }}
          >
            {editingId === dept.id ? (
              // Inline editing mode
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={inlineForm.name}
                    onChange={(e) => handleInlineFieldChange('name', e.target.value, dept.id)}
                    placeholder="Department name"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Code</Label>
                  <Input
                    value={inlineForm.code}
                    onChange={(e) => handleInlineFieldChange('code', e.target.value, dept.id)}
                    placeholder="Department code"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Head</Label>
                  <Input
                    value={inlineForm.head}
                    onChange={(e) => handleInlineFieldChange('head', e.target.value, dept.id)}
                    placeholder="Department head"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={inlineForm.description}
                    onChange={(e) => handleInlineFieldChange('description', e.target.value, dept.id)}
                    placeholder="Description"
                    rows={2}
                    className="text-xs"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelInlineEdit}
                    className="flex-1 h-7 text-xs"
                  >
                    Done
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive"
                    onClick={() => handleDelete(dept.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              // Display mode
              <>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-accent-foreground" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{dept.name}</h3>
                      <p className="text-xs text-muted-foreground">{dept.code}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-primary hover:text-primary/80"
                      onClick={() => handleStartInlineEdit(dept)}
                      title="Click to edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive"
                      onClick={() => handleDelete(dept.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {dept.head && <p className="text-xs text-muted-foreground mt-3">Head: {dept.head}</p>}
                {dept.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{dept.description}</p>
                )}
              </>
            )}
          </div>
        ))}
        {departments.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full text-center py-12">
            No departments yet. Click "Add Department" to get started.
          </p>
        )}
      </div>
    </div>
  );
}
