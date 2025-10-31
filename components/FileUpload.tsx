import React, { useState, useCallback } from 'react';
import UploadIcon from './icons/UploadIcon';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (files: FileList | null) => {
    if (files && files.length > 0) {
      onFileUpload(files[0]);
    }
  };

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFile(e.dataTransfer.files);
  }, [handleFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files);
  };

  return (
    <div className="flex items-center justify-center w-full min-h-[70vh]">
      <div 
        className={`flex flex-col items-center justify-center w-full max-w-2xl p-8 border-2 border-dashed rounded-xl transition-colors
        ${isDragging ? 'border-indigo-500 bg-slate-800/50' : 'border-slate-700 hover:border-slate-500'}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="text-center">
            <UploadIcon className="mx-auto h-12 w-12 text-slate-500" />
            <p className="mt-5 text-lg font-semibold text-slate-300">
                Drag and drop your file here
            </p>
            <p className="mt-1 text-sm text-slate-400">
                PDF, TXT, DOCX, PNG, JPG, etc.
            </p>
            <div className="mt-6">
                <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-slate-900">
                    <span>Or browse files</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={onFileChange} />
                </label>
            </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;