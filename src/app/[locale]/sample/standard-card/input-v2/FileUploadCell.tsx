'use client';

import { useRef, useState } from 'react';
import { Upload, X, ImageIcon, FileText } from 'lucide-react';

interface FileUploadCellProps {
  value: string;
  onChange?: (value: string) => void;
  accept?: string;
  className?: string;
  uploadText: string;
}

export function FileUploadCell({
  value,
  onChange,
  accept = '.pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp',
  className = '',
  uploadText
}: FileUploadCellProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState(value);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onChange?.(file.name);
    }
  };

  const handleClear = () => {
    setFileName('');
    onChange?.('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = () => {
    if (!fileName) return <Upload className="h-4 w-4 text-gray-400" />;
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '')) {
      return <ImageIcon className="h-4 w-4 text-blue-500" />;
    }
    return <FileText className="h-4 w-4 text-red-500" />;
  };

  return (
    <div className={`min-h-[24px] flex items-center justify-center gap-1 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      {fileName ? (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {getFileIcon()}
          <span className="text-xs truncate flex-1 dark:text-gray-300" title={fileName}>{fileName}</span>
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 hover:bg-accent/50 rounded"
          >
            <X className="h-3 w-3 text-gray-400 dark:text-gray-500" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <Upload className="h-4 w-4" />
          <span>{uploadText}</span>
        </button>
      )}
    </div>
  );
}
