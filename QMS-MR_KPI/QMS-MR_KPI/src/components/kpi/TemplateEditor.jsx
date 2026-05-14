import { useState } from 'react';
import serverApi from '@/api/serverClient';
const localApi = serverApi;
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Plus, GripVertical } from 'lucide-react';

function genKey() {
  return `col_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export default function TemplateEditor({ template, deptId, deptName, onSave, onClose }) {
  const [title, setTitle] = useState(template?.title || `${deptName} KPI Table`);
  const [columns, setColumns] = useState(
    template?.columns || [
      { key: 'target', label: 'Target', type: 'number' },
      { key: 'actual', label: 'Actual', type: 'number' },
      { key: 'achievement', label: 'Achievement %', type: 'percent' },
      { key: 'remarks', label: 'Remarks', type: 'text' },
    ]
  );
  const [kpiItems, setKpiItems] = useState(
    template?.kpi_items || []
  );
  const [saving, setSaving] = useState(false);

  const addColumn = () => {
    setColumns((prev) => [...prev, { key: genKey(), label: 'New Column', type: 'number' }]);
  };

  const updateColumn = (idx, field, value) => {
    setColumns((prev) => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const removeColumn = (idx) => {
    setColumns((prev) => prev.filter((_, i) => i !== idx));
  };

  const addKpiItem = () => {
    setKpiItems((prev) => [...prev, { key: genKey(), label: 'New KPI', weight: 0 }]);
  };

  const updateKpiItem = (idx, field, value) => {
    setKpiItems((prev) => prev.map((k, i) => i === idx ? { ...k, [field]: value } : k));
  };

  const removeKpiItem = (idx) => {
    setKpiItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    const totalWeight = kpiItems.reduce((s, k) => s + (Number(k.weight) || 0), 0);
    const data = { department_id: deptId, department_name: deptName, title, columns, kpi_items: kpiItems };
    let saved;
    if (template?.id) {
      saved = await localApi.entities.KPITemplate.update(template.id, data);
      saved = { ...template, ...data };
    } else {
      saved = await localApi.entities.KPITemplate.create(data);
    }
    setSaving(false);
    onSave(saved);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure KPI Table</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Table Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sales KPI Review" />
          </div>

          {/* Columns */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold">Table Columns (Headers)</Label>
              <Button variant="outline" size="sm" onClick={addColumn} className="gap-1 h-7 text-xs">
                <Plus className="w-3 h-3" /> Add Column
              </Button>
            </div>
            <div className="space-y-2">
              {columns.map((col, idx) => (
                <div key={col.key} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
                  <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input
                    value={col.label}
                    onChange={(e) => updateColumn(idx, 'label', e.target.value)}
                    className="h-7 text-xs flex-1"
                    placeholder="Column name"
                  />
                  <Select value={col.type} onValueChange={(v) => updateColumn(idx, 'type', v)}>
                    <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="percent">Percent (%)</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeColumn(idx)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* KPI Row Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold">KPI Indicators (Rows)</Label>
              <Button variant="outline" size="sm" onClick={addKpiItem} className="gap-1 h-7 text-xs">
                <Plus className="w-3 h-3" /> Add KPI
              </Button>
            </div>
            <div className="space-y-2">
              {kpiItems.map((kpi, idx) => (
                <div key={kpi.key} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
                  <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input
                    value={kpi.label}
                    onChange={(e) => updateKpiItem(idx, 'label', e.target.value)}
                    className="h-7 text-xs flex-1"
                    placeholder="KPI name"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <Input
                      type="number"
                      value={kpi.weight}
                      onChange={(e) => updateKpiItem(idx, 'weight', e.target.value)}
                      className="h-7 w-16 text-xs text-center"
                      placeholder="0"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeKpiItem(idx)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {kpiItems.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No KPI rows yet. Add some indicators.</p>
              )}
            </div>
            {kpiItems.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Total weight: <span className="font-semibold">{kpiItems.reduce((s, k) => s + (Number(k.weight) || 0), 0)}%</span>
                {kpiItems.reduce((s, k) => s + (Number(k.weight) || 0), 0) !== 100 && (
                  <span className="text-warning ml-1">(should total 100%)</span>
                )}
              </p>
            )}
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Save Table Configuration'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
