'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserCircle, Building2, Briefcase, Phone, Mail, Calendar, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

// 员工接口
interface Employee {
  id: number;
  employee_no: string;
  name: string;
  gender: number;
  phone: string;
  email: string;
  dept_id: number;
  dept_name: string;
  role_id: number;
  role_name: string;
  position: string;
  entry_date: string;
  status: number;
  remark?: string;
}

function EmployeeQueryContent() {
  const searchParams = useSearchParams();
  const employeeId = searchParams.get('id');
  
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (employeeId) {
      fetchEmployee(parseInt(employeeId));
    } else {
      setError('未提供员工ID');
      setLoading(false);
    }
  }, [employeeId]);

  const fetchEmployee = async (id: number) => {
    try {
      const response = await fetch(`/api/organization/employee?id=${id}`);
      const result = await response.json();
      if (result.success && result.data) {
        setEmployee(result.data);
      } else {
        setError('未找到该员工信息');
      }
    } catch (error) {
      console.error('获取员工信息失败:', error);
      setError('获取员工信息失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: number) => {
    const styles: Record<number, string> = {
      1: 'bg-green-100 text-green-800',
      0: 'bg-gray-100 text-gray-800',
      2: 'bg-yellow-100 text-yellow-800',
      3: 'bg-red-100 text-red-800'
    };
    const labels: Record<number, string> = {
      1: '在职',
      0: '停用',
      2: '试用期',
      3: '离职'
    };
    return (
      <Badge className={styles[status] || 'bg-gray-100'}>
        {labels[status] || '未知'}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">查询失败</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link href="/hr/employee">
              <Button className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回员工列表
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCircle className="w-8 h-8 text-gray-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">未找到员工</h2>
            <p className="text-gray-600 mb-6">该员工信息不存在或已被删除</p>
            <Link href="/hr/employee">
              <Button className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回员工列表
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* 头部 */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/hr/employee">
            <Button variant="outline" className="bg-white/80 backdrop-blur">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回员工列表
            </Button>
          </Link>
          <div className="text-sm text-gray-500">
            员工编号: {employee.employee_no}
          </div>
        </div>

        {/* 员工信息卡片 */}
        <Card className="overflow-hidden shadow-xl border-0">
          {/* 卡片头部 - 渐变色背景 */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* 头像区域 */}
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center border-4 border-white/30">
                <UserCircle className="w-14 h-14" />
              </div>
              {/* 基本信息 */}
              <div className="text-center md:text-left flex-1">
                <h1 className="text-3xl font-bold mb-2">{employee.name}</h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <Badge className="bg-white/20 text-white border-0">
                    {employee.gender === 1 ? '男' : '女'}
                  </Badge>
                  {getStatusBadge(employee.status)}
                </div>
              </div>
            </div>
          </div>

          <CardContent className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 部门信息 */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">所属部门</p>
                  <p className="font-semibold text-gray-900">{employee.dept_name || '-'}</p>
                </div>
              </div>

              {/* 职位信息 */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">职位</p>
                  <p className="font-semibold text-gray-900">{employee.position || '-'}</p>
                </div>
              </div>

              {/* 角色信息 */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <UserCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">角色</p>
                  <p className="font-semibold text-gray-900">{employee.role_name || '-'}</p>
                </div>
              </div>

              {/* 入职日期 */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">入职日期</p>
                  <p className="font-semibold text-gray-900">{employee.entry_date || '-'}</p>
                </div>
              </div>

              {/* 联系电话 */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">联系电话</p>
                  <p className="font-semibold text-gray-900">{employee.phone || '-'}</p>
                </div>
              </div>

              {/* 邮箱 */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">邮箱</p>
                  <p className="font-semibold text-gray-900">{employee.email || '-'}</p>
                </div>
              </div>
            </div>

            {/* 备注 */}
            {employee.remark && (
              <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                <p className="text-sm text-yellow-800 font-medium mb-1">备注</p>
                <p className="text-gray-700">{employee.remark}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 底部版权 */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© 2024 达昌 ERP 系统 - 员工信息查询</p>
        </div>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-gray-600">加载中...</p>
      </div>
    </div>
  );
}

export default function EmployeeQueryPage() {
  return (
    <Suspense fallback={<Loading />}>
      <EmployeeQueryContent />
    </Suspense>
  );
}
