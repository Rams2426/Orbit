import React, { useState } from 'react';
import { DocNote } from '../types';
import { FileText, Plus, Pin, Trash2, Download, Copy, Check, Eye, Edit3, Hash, Bold, List, CheckSquare, Code, Quote } from 'lucide-react';
import { playChime } from '../utils/sound';

interface DocsWorkspaceProps {
  docs: DocNote[];
  onSaveDoc: (doc: DocNote) => void;
  onDeleteDoc: (id: string) => void;
}

export const DocsWorkspace: React.FC<DocsWorkspaceProps> = ({
  docs,
  onSaveDoc,
  onDeleteDoc,
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(docs[0]?.id || '');
  const [searchDocQuery, setSearchDocQuery] = useState('');
  const [previewMode, setPreviewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [copied, setCopied] = useState(false);

  const selectedDoc = docs.find((d) => d.id === selectedDocId) || docs[0];

  const filteredDocs = docs.filter(
    (d) =>
      d.title.toLowerCase().includes(searchDocQuery.toLowerCase()) ||
      d.content.toLowerCase().includes(searchDocQuery.toLowerCase()) ||
      d.tags.some((t) => t.toLowerCase().includes(searchDocQuery.toLowerCase()))
  );

  const handleUpdateTitle = (title: string) => {
    if (!selectedDoc) return;
    onSaveDoc({
      ...selectedDoc,
      title,
      updatedAt: new Date().toISOString().split('T')[0],
    });
  };

  const handleUpdateContent = (content: string) => {
    if (!selectedDoc) return;
    onSaveDoc({
      ...selectedDoc,
      content,
      updatedAt: new Date().toISOString().split('T')[0],
    });
  };

  const handleTogglePin = () => {
    if (!selectedDoc) return;
    onSaveDoc({
      ...selectedDoc,
      pinned: !selectedDoc.pinned,
    });
    playChime('click');
  };

  const handleCreateDoc = () => {
    const newDoc: DocNote = {
      id: `doc-${Date.now()}`,
      title: 'Untitled Spec & Architecture Notes',
      category: 'spec',
      updatedAt: new Date().toISOString().split('T')[0],
      tags: ['Engineering', 'Draft'],
      pinned: false,
      content: `# Untitled Spec & Architecture Notes\n\n## Overview\nDescribe the system requirements and technical specification here.\n\n## Acceptance Criteria\n- [ ] Fast startup latency\n- [ ] Resilient error fallback`,
    };
    onSaveDoc(newDoc);
    setSelectedDocId(newDoc.id);
    playChime('click');
  };

  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('doc-editor-textarea') as HTMLTextAreaElement;
    if (!textarea || !selectedDoc) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = selectedDoc.content;
    const selectedPart = currentText.substring(start, end);

    const replacement = prefix + (selectedPart || 'text') + suffix;
    const newContent = currentText.substring(0, start) + replacement + currentText.substring(end);

    handleUpdateContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + replacement.length - suffix.length);
    }, 10);
  };

  const handleCopyMarkdown = () => {
    if (!selectedDoc) return;
    navigator.clipboard.writeText(selectedDoc.content);
    setCopied(true);
    playChime('click');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!selectedDoc) return;
    const blob = new Blob([selectedDoc.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDoc.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Simple clean markdown-to-HTML parser for formatted preview
  const renderSimpleMarkdown = (md: string) => {
    if (!md) return null;
    const lines = md.split('\n');

    return (
      <div className="space-y-3 font-sans text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
        {lines.map((line, idx) => {
          if (line.startsWith('# ')) {
            return (
              <h1 key={idx} className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white pt-2 pb-1 border-b border-slate-200 dark:border-slate-800">
                {line.replace('# ', '')}
              </h1>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h2 key={idx} className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 pt-3 pb-0.5">
                {line.replace('## ', '')}
              </h2>
            );
          }
          if (line.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 pt-2">
                {line.replace('### ', '')}
              </h3>
            );
          }
          if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
            const isChecked = line.startsWith('- [x] ');
            const text = line.replace(/- \[[ x]\] /, '');
            return (
              <div key={idx} className="flex items-center gap-2 pl-2">
                <input type="checkbox" checked={isChecked} readOnly className="rounded text-indigo-600 pointer-events-none" />
                <span className={isChecked ? 'line-through text-slate-400' : ''}>{text}</span>
              </div>
            );
          }
          if (line.startsWith('- ')) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-slate-400 mt-1">·</span>
                <span>{line.replace('- ', '')}</span>
              </div>
            );
          }
          if (line.startsWith('> ')) {
            return (
              <blockquote key={idx} className="border-l-2 border-indigo-500 pl-3 py-1 italic text-slate-600 dark:text-slate-400 my-2">
                {line.replace('> ', '')}
              </blockquote>
            );
          }
          if (line.startsWith('```')) {
            return (
              <div key={idx} className="font-mono text-xs text-slate-400 py-0.5">
                {line}
              </div>
            );
          }
          if (line.trim() === '') {
            return <div key={idx} className="h-1" />;
          }
          return <p key={idx}>{line}</p>;
        })}
      </div>
    );
  };

  const wordCount = selectedDoc ? selectedDoc.content.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar document list */}
      <div className="w-full md:w-80 border-r border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-wide uppercase">
              Specs & Documentation
            </span>
            <button
              onClick={handleCreateDoc}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Spec</span>
            </button>
          </div>

          <input
            type="text"
            value={searchDocQuery}
            onChange={(e) => setSearchDocQuery(e.target.value)}
            placeholder="Search documents & RFCs..."
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>

        {/* List of Docs */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
          {filteredDocs.map((doc) => {
            const isSelected = doc.id === selectedDoc?.id;
            return (
              <div
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`p-3.5 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-l-2 border-indigo-600 dark:border-indigo-400'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {doc.title}
                  </span>
                  {doc.pinned && <Pin className="h-3 w-3 text-indigo-600 shrink-0 fill-current" />}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                  <span>{doc.updatedAt}</span>
                  <span>·</span>
                  <span className="capitalize">{doc.category}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Editor & Viewer main area */}
      {selectedDoc ? (
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
          {/* Top Doc Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
            {/* Title edit */}
            <input
              type="text"
              value={selectedDoc.title}
              onChange={(e) => handleUpdateTitle(e.target.value)}
              className="text-base font-bold text-slate-900 dark:text-white bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5 flex-1 min-w-[200px]"
            />

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Formatting quick buttons */}
              <div className="hidden sm:flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-700 pr-2 mr-1">
                <button
                  onClick={() => insertFormatting('## ')}
                  className="p-1 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Heading"
                >
                  <Hash className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => insertFormatting('**', '**')}
                  className="p-1 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Bold"
                >
                  <Bold className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => insertFormatting('- ')}
                  className="p-1 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Bullet list"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => insertFormatting('- [ ] ')}
                  className="p-1 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Checklist"
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => insertFormatting('```ts\n', '\n```')}
                  className="p-1 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Code block"
                >
                  <Code className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* View Switcher: Split / Edit / Preview */}
              <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5 text-xs">
                <button
                  onClick={() => setPreviewMode('edit')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    previewMode === 'edit'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  Edit
                </button>
                <button
                  onClick={() => setPreviewMode('split')}
                  className={`hidden lg:block px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    previewMode === 'split'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  Split
                </button>
                <button
                  onClick={() => setPreviewMode('preview')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    previewMode === 'preview'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  Preview
                </button>
              </div>

              {/* Pin */}
              <button
                onClick={handleTogglePin}
                title={selectedDoc.pinned ? 'Unpin Spec' : 'Pin to top'}
                className={`p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${
                  selectedDoc.pinned ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                }`}
              >
                <Pin className="h-3.5 w-3.5" />
              </button>

              {/* Copy */}
              <button
                onClick={handleCopyMarkdown}
                title="Copy markdown content"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>

              {/* Download */}
              <button
                onClick={handleDownloadMarkdown}
                title="Download as .md file"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
              </button>

              {/* Delete */}
              <button
                onClick={() => {
                  if (confirm(`Delete document "${selectedDoc.title}"?`)) {
                    onDeleteDoc(selectedDoc.id);
                  }
                }}
                title="Delete document"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Document Content Split or Single View */}
          <div className="flex-1 flex overflow-hidden">
            {/* Editor Textarea */}
            {(previewMode === 'edit' || previewMode === 'split') && (
              <div className={`flex-1 h-full p-6 overflow-y-auto ${previewMode === 'split' ? 'border-r border-slate-200 dark:border-slate-800' : ''}`}>
                <textarea
                  id="doc-editor-textarea"
                  value={selectedDoc.content}
                  onChange={(e) => handleUpdateContent(e.target.value)}
                  placeholder="Write your markdown spec or architecture document..."
                  className="w-full h-full resize-none font-mono text-xs sm:text-sm text-slate-800 dark:text-slate-200 bg-transparent border-none focus:outline-none leading-relaxed"
                />
              </div>
            )}

            {/* Formatted Preview */}
            {(previewMode === 'preview' || previewMode === 'split') && (
              <div className="flex-1 h-full p-6 overflow-y-auto bg-slate-50/30 dark:bg-slate-900/40">
                {renderSimpleMarkdown(selectedDoc.content)}
              </div>
            )}
          </div>

          {/* Footer Metadata */}
          <div className="px-6 py-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between bg-white dark:bg-slate-900">
            <span>Last modified: {selectedDoc.updatedAt}</span>
            <span className="tabular-nums">{wordCount} words · {selectedDoc.content.length} characters</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
          <p className="text-xs">Select or create a document to get started.</p>
        </div>
      )}
    </div>
  );
};
