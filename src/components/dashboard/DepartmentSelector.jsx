import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DepartmentSelector({ departments, value, onChange }) {
  return (
    <Select value={value || 'all'} onValueChange={onChange}>
      <SelectTrigger className="w-44 h-8 text-xs">
        <SelectValue placeholder="All Departments" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Departments</SelectItem>
        {departments.map((dept) => (
          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}