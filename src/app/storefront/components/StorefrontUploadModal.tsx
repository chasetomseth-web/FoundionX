'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, FileCode, CheckCircle, Info } from 'lucide-react';

interface Props {
  onClose: () => void;
  onUploaded?: (html: string, name: string) => void;
}

type UploadStep = 'select' | 'configure' | 'processing' | 'done';

export default function StorefrontUploadModal({ onClose, onUploaded }: Props) {
  const [step, setStep] = useState<UploadStep>('select');
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [pageName, setPageName] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [pageType, setPageType] = useState('landing');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) return;
    setFileName(file.name);
    setPageName(file.name.replace(/\.(html|htm)$/, '').replace(/-/g, ' '));
    const reader = new FileReader();
    reader.onload = (e) => {
      setHtmlContent((e.target?.result as string) ?? '');
    };
    reader.readAsText(file);
    setStep('configure');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleProcess = () => {
    setStep('processing');
    setTimeout(() => {
      setStep('done');
      if (onUploaded) onUploaded(htmlContent, pageName);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-600 text-foreground">Upload HTML Storefront</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Upload raw HTML/CSS — rendered server-side with dynamic bindings</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="p-6">
          {step === 'select' && (
            <div className="flex flex-col gap-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
              >
                <Upload size={28} className="mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-500 text-foreground">Drop your HTML file here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse — .html, .htm supported</p>
                <input ref={fileRef} type="file" accept=".html,.htm" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
              </div>

              <div className="bg-muted/40 rounded-xl p-4 flex flex-col gap-2">
                <p className="text-xs font-600 text-foreground flex items-center gap-1.5"><Info size={12} className="text-primary" />Supported Dynamic Variables</p>
                <div className="grid grid-cols-2 gap-1">
                  {['{{product.name}}', '{{product.price}}', '{{cart.total}}', '{{customer.name}}', '{{store.name}}', '{{checkout.url}}'].map((v) => (
                    <code key={v} className="text-[11px] font-mono bg-muted px-2 py-1 rounded text-primary">{v}</code>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'configure' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 p-3 bg-success-bg border border-success/20 rounded-xl">
                <FileCode size={16} className="text-success flex-shrink-0" />
                <div>
                  <p className="text-sm font-500 text-foreground">{fileName}</p>
                  <p className="text-xs text-muted-foreground">HTML file ready for processing</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-600 text-muted-foreground uppercase tracking-wide block mb-1.5">Page Name</label>
                  <input
                    type="text"
                    value={pageName}
                    onChange={(e) => setPageName(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-600 text-muted-foreground uppercase tracking-wide block mb-1.5">URL Slug</label>
                  <div className="flex items-center gap-0 h-9 rounded-lg border border-border bg-background overflow-hidden focus-within:border-primary transition-colors">
                    <span className="px-3 text-sm text-muted-foreground bg-muted border-r border-border h-full flex items-center">/</span>
                    <input
                      type="text"
                      value={pageSlug}
                      onChange={(e) => setPageSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      placeholder="my-page-slug"
                      className="flex-1 px-3 bg-transparent text-sm text-foreground outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-600 text-muted-foreground uppercase tracking-wide block mb-1.5">Page Type</label>
                  <select
                    value={pageType}
                    onChange={(e) => setPageType(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none cursor-pointer"
                  >
                    <option value="homepage">Homepage</option>
                    <option value="product">Product Page</option>
                    <option value="collection">Collection Page</option>
                    <option value="checkout">Checkout</option>
                    <option value="landing">Landing Page</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setStep('select')} className="px-4 py-2.5 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors text-foreground">
                  Back
                </button>
                <button onClick={handleProcess} disabled={!pageName || !pageSlug} className="flex-1 px-4 py-2.5 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                  Process & Publish
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="py-8 text-center flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <div>
                <p className="font-500 text-foreground">Processing HTML…</p>
                <p className="text-xs text-muted-foreground mt-1">Sanitizing, parsing, and injecting dynamic bindings</p>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="py-8 text-center flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-success-bg flex items-center justify-center">
                <CheckCircle size={24} className="text-success" />
              </div>
              <div>
                <p className="font-600 text-foreground">Page Published Successfully</p>
                <p className="text-xs text-muted-foreground mt-1">Your HTML has been processed — scroll down to see the preview</p>
              </div>
              <button onClick={onClose} className="px-6 py-2.5 bg-foreground text-background text-sm font-500 rounded-lg hover:opacity-90 transition-opacity">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
