'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useReactFlow, useNodesState, useEdgesState } from '@xyflow/react';
import { useTranslations } from 'next-intl';

interface TableInfo {
  name: string;
  comment: string;
  rows: number;
}

interface Relation {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: string;
  constraint?: string;
}

interface ModuleData {
  [key: string]: TableInfo[];
}

interface DbRelations {
  tables: TableInfo[];
  foreignKeys: Relation[];
  logicalRelations: Relation[];
  modules: ModuleData;
}

export default function DbRelationsPage() {
  // 翻译钩子
  const t = useTranslations('Common');
  const tc = useTranslations('Common');

  const moduleColors: Record<string, string> = {
    system: 'bg-blue-500',
    order: 'bg-green-500',
    product: 'bg-yellow-500',
    partner: 'bg-purple-500',
    production: 'bg-cyan-500',
    inventory: 'bg-orange-500',
    finance: 'bg-pink-500',
    sample: 'bg-lime-500',
    other: 'bg-gray-500'
  };

  const moduleLabels: Record<string, string> = {
    system: '系统管理',
    order: '订单管理',
    product: '产品管理',
    partner: '合作伙伴',
    production: '生产管理',
    inventory: '库存管理',
    finance: '财务管理',
    sample: '样品管理',
    other: '其他'
  };

  const [data, setData] = useState<DbRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/db-relations')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load data:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">正在加载数据库关系分析...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive">加载失败，请检查数据</p>
      </div>
    );
  }

  const totalTables = data.tables.length;
  const totalForeignKeys = data.foreignKeys.length;
  const totalLogicalRelations = data.logicalRelations.length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">数据库表关系分析</h1>
        <p className="text-muted-foreground">
          分析数据库 {totalTables} 张表之间的逻辑关联关系
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">总表数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTables}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">外键关系</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{totalForeignKeys}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">逻辑关联</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{totalLogicalRelations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">模块数量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {Object.keys(data.modules).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 图表展示 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 模块分布饼图 */}
        <Card>
          <CardHeader>
            <CardTitle>模块分布</CardTitle>
            <CardDescription>按业务模块分组的表数量分布</CardDescription>
          </CardHeader>
          <CardContent>
            <img
              src="https://mdn.alipayobjects.com/one_clip/afts/img/AW7BSbaam-gAAAAARSAAAAgAoEACAQFr/original"
              alt="模块分布饼图"
              className="w-full h-auto"
            />
          </CardContent>
        </Card>

        {/* 关联数量柱状图 */}
        <Card>
          <CardHeader>
            <CardTitle>表关联数量 TOP 20</CardTitle>
            <CardDescription>关联关系最多的表</CardDescription>
          </CardHeader>
          <CardContent>
            <img
              src="https://mdn.alipayobjects.com/one_clip/afts/img/GnogTL6uYV8AAAAAQ0AAAAgAoEACAQFr/original"
              alt="关联数量柱状图"
              className="w-full h-auto"
            />
          </CardContent>
        </Card>
      </div>

      {/* 详细信息标签页 */}
      <Tabs defaultValue="modules" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="modules">模块分组</TabsTrigger>
          <TabsTrigger value="tables">所有表</TabsTrigger>
          <TabsTrigger value="foreignkeys">外键关系</TabsTrigger>
          <TabsTrigger value="logical">逻辑关联</TabsTrigger>
        </TabsList>

        {/* 模块分组 */}
        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle>模块分组</CardTitle>
              <CardDescription>按业务模块分组的数据库表</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(data.modules).map(([module, tables]) => (
                  <Card
                    key={module}
                    className={`cursor-pointer transition-all hover:shadow-lg ${selectedModule === module ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setSelectedModule(selectedModule === module ? null : module)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Badge className={moduleColors[module]}>
                            {moduleLabels[module] || module}
                          </Badge>
                        </CardTitle>
                        <Badge variant="outline">{tables.length} 张表</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-2">
                          {tables.map(table => (
                            <div
                              key={table.name}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{table.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {table.comment || '无注释'}
                                </p>
                              </div>
                              <Badge variant="secondary" className="ml-2">
                                {table.rows} 行
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 所有表 */}
        <TabsContent value="tables">
          <Card>
            <CardHeader>
              <CardTitle>所有数据库表</CardTitle>
              <CardDescription>共 {totalTables} 张表</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>表名</TableHead>
                    <TableHead>说明</TableHead>
                    <TableHead>数据行数</TableHead>
                    <TableHead>模块</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.tables.map(table => {
                    const module = Object.entries(data.modules).find(([, tables]) =>
                      tables.some(t => t.name === table.name)
                    )?.[0] || 'other';

                    return (
                      <TableRow key={table.name}>
                        <TableCell className="font-medium">{table.name}</TableCell>
                        <TableCell>{table.comment || '-'}</TableCell>
                        <TableCell>{table.rows}</TableCell>
                        <TableCell>
                          <Badge className={moduleColors[module]}>
                            {moduleLabels[module] || module}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 外键关系 */}
        <TabsContent value="foreignkeys">
          <Card>
            <CardHeader>
              <CardTitle>外键关系</CardTitle>
              <CardDescription>共 {totalForeignKeys} 个外键关系</CardDescription>
            </CardHeader>
            <CardContent>
              {totalForeignKeys === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  数据库中没有定义外键关系
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>源表</TableHead>
                      <TableHead>源字段</TableHead>
                      <TableHead>目标表</TableHead>
                      <TableHead>目标字段</TableHead>
                      <TableHead>约束名</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.foreignKeys.map((fk, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{fk.fromTable}</TableCell>
                        <TableCell>{fk.fromColumn}</TableCell>
                        <TableCell className="font-medium text-red-500">
                          {fk.toTable}
                        </TableCell>
                        <TableCell>{fk.toColumn}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{fk.constraint}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 逻辑关联 */}
        <TabsContent value="logical">
          <Card>
            <CardHeader>
              <CardTitle>逻辑关联关系</CardTitle>
              <CardDescription>
                基于字段名推断的关联关系，共 {totalLogicalRelations} 个
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>源表</TableHead>
                    <TableHead>关联字段</TableHead>
                    <TableHead>目标表</TableHead>
                    <TableHead>目标字段</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.logicalRelations.map((rel, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{rel.fromTable}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{rel.fromColumn}</Badge>
                      </TableCell>
                      <TableCell className="font-medium text-blue-500">
                        {rel.toTable}
                      </TableCell>
                      <TableCell>{rel.toColumn}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
