'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';

interface FileInfo {
  path: string;
  size: number;
  modified: string;
}

const formatSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  for (const unit of units) {
    if (size < 1024) return `${size.toFixed(1)} ${unit}`;
    size /= 1024;
  }
  return `${size.toFixed(1)} TB`;
};

const getFileExtension = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return ext;
};

const getFileType = (path: string): string => {
  const ext = getFileExtension(path);
  const types: Record<string, string[]> = {
    TypeScript: ['ts', 'tsx'],
    JavaScript: ['js', 'jsx', 'mjs'],
    Style: ['css', 'scss', 'less', 'sass'],
    Data: ['json', 'yaml', 'yml', 'xml'],
    Document: ['md', 'txt', 'doc', 'docx'],
    Image: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'ico'],
    Config: ['config', 'conf', 'ini'],
  };

  for (const [type, extensions] of Object.entries(types)) {
    if (extensions.includes(ext)) return type;
  }
  return 'Other';
};

const typeColors: Record<string, string> = {
  TypeScript: 'bg-blue-500',
  JavaScript: 'bg-yellow-500',
  Style: 'bg-pink-500',
  Data: 'bg-green-500',
  Document: 'bg-gray-500',
  Image: 'bg-purple-500',
  Config: 'bg-orange-500',
  Other: 'bg-slate-500',
};

export default function ProjectUploaderPage() {
  // 翻译钩子
  const tc = useTranslations('Common');

  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [repoName, setRepoName] = useState('erp-project');
  const [repoDesc, setRepoDesc] = useState(tc('toolsRepoDescDefault'));
  const [isPrivate, setIsPrivate] = useState(false);
  const [commitMsg, setCommitMsg] = useState('Initial commit');
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetch('/api/project-files')
      .then((res) => res.json())
      .then((data) => {
        setFiles(data.files || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredFiles = files.filter((f) =>
    f.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCount = selectedFiles.size;
  const selectedSize = files
    .filter((f) => selectedFiles.has(f.path))
    .reduce((sum, f) => sum + f.size, 0);

  const toggleSelect = (path: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedFiles(newSelected);
  };

  const selectAll = () => {
    setSelectedFiles(new Set(filteredFiles.map((f) => f.path)));
  };

  const deselectAll = () => {
    setSelectedFiles(new Set());
  };

  const generateGitignore = async () => {
    try {
      const res = await fetch('/api/project-files/gitignore', { method: 'POST' });
      const data = await res.json();
      setStatus(data.message);
    } catch {
      setStatus(tc('toolsGenGitignoreFailed'));
    }
  };

  const uploadToGitHub = async () => {
    setUploading(true);
    setStatus(tc('toolsUploadingStatus'));

    try {
      const res = await fetch('/api/project-files/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoName,
          repoDesc,
          isPrivate,
          commitMsg,
          files: Array.from(selectedFiles),
        }),
      });

      const data = await res.json();
      setStatus(data.message);
    } catch {
      setStatus(tc('toolsUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{tc('toolsLoading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 标题 */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{tc('toolsUploadTitle')}</h1>
        <p className="text-muted-foreground">{tc('toolsUploadDesc')}</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{tc('toolsFileTotal')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{files.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{tc('toolsTotalSize')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatSize(files.reduce((sum, f) => sum + f.size, 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{tc('selected')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{selectedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{tc('toolsSelectedSize')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{formatSize(selectedSize)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="files" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="files">{tc('toolsFileList')}</TabsTrigger>
          <TabsTrigger value="settings">{tc('toolsUploadSettings')}</TabsTrigger>
        </TabsList>

        <TabsContent value="files">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{tc('toolsFileList')}</CardTitle>
                  <CardDescription>
                    {tc('analysisTotalPrefix')}
                    {files.length}
                    {tc('toolsFileCountSuffix')}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder={tc('toolsSearchFile')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64"
                  />
                  <Button onClick={selectAll}>{tc('selectAll')}</Button>
                  <Button variant="outline" onClick={deselectAll}>
                    {tc('toolsCancelSelectAll')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">{tc('toolsSelect')}</TableHead>
                      <TableHead>{tc('toolsFilePath')}</TableHead>
                      <TableHead className="w-24">{tc('type')}</TableHead>
                      <TableHead className="w-24">{tc('toolsFileSize')}</TableHead>
                      <TableHead className="w-36">{tc('toolsModifiedTime')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFiles.slice(0, 100).map((file) => {
                      const type = getFileType(file.path);
                      return (
                        <TableRow key={file.path}>
                          <TableCell>
                            <Checkbox
                              checked={selectedFiles.has(file.path)}
                              onCheckedChange={() => toggleSelect(file.path)}
                            />
                          </TableCell>
                          <TableCell className="font-medium truncate max-w-md">
                            {file.path}
                          </TableCell>
                          <TableCell>
                            <Badge className={typeColors[type]}>{type}</Badge>
                          </TableCell>
                          <TableCell>{formatSize(file.size)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {file.modified}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {filteredFiles.length > 100 && (
                  <p className="text-center text-muted-foreground py-4">
                    {tc('toolsDisplayLimitPrefix')}
                    {filteredFiles.length}
                    {tc('toolsDisplayLimitSuffix')}
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>{tc('toolsRepoSettings')}</CardTitle>
              <CardDescription>{tc('toolsRepoSettingsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="repoName">{tc('toolsRepoName')}</Label>
                  <Input
                    id="repoName"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repoDesc">{tc('toolsRepoDesc')}</Label>
                  <Input
                    id="repoDesc"
                    value={repoDesc}
                    onChange={(e) => setRepoDesc(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="commitMsg">{tc('toolsCommitMsg')}</Label>
                <Input
                  id="commitMsg"
                  value={commitMsg}
                  onChange={(e) => setCommitMsg(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="private"
                  checked={isPrivate}
                  onCheckedChange={(checked) => setIsPrivate(checked as boolean)}
                />
                <Label htmlFor="private">{tc('toolsPrivateRepo')}</Label>
              </div>

              <div className="flex gap-4 pt-4">
                <Button onClick={generateGitignore} variant="outline">
                  {tc('toolsGenerateGitignore')}
                </Button>
                <Button onClick={uploadToGitHub} disabled={uploading || selectedCount === 0}>
                  {uploading
                    ? tc('toolsUploading')
                    : tc('toolsUploadFilesToGithub', { count: selectedCount })}
                </Button>
              </div>

              {status && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">{status}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
