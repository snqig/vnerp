'use client';

import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UserItem {
  id: number;
  username: string;
  real_name: string;
  dept_name: string;
  status: number;
}

interface UserSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function UserSelect({
  value,
  onChange,
  placeholder = '选择用户',
  className,
}: UserSelectProps) {
  const [users, setUsers] = useState<UserItem[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/system/user?pageSize=200');
        const result = await res.json();
        if (result.success) {
          const list = result.data.list || [];
          setUsers(list.filter((u: UserItem) => u.status === 1));
        }
      } catch {}
    };
    fetchUsers();
  }, []);

  return (
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {users.map((u) => (
          <SelectItem key={u.id} value={u.real_name || u.username}>
            {u.real_name || u.username}
            {u.dept_name ? ` (${u.dept_name})` : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
