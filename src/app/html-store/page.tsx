'use client';

import { useState, useEffect } from 'react';
import { FileCode, Upload, Copy, Check, Trash2, Eye, EyeOff } from 'lucide-react';
import BackButton from '@/components/ui/back-button';

interface HtmlPage {
  id: string;
  name: string;
  slug: string;
  isHomePage: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Snippets {
  affiliateTracking: string;
  checkoutButton: string;
  portalLogin: string;
  cookieConsent: string;
  trackingPixels: string;
  fullBundle: string;
}

export default function HtmlStorePage() {
  const [pages, setPages] = useState<HtmlPage[]>([]);
  const [snippets, setSnippets] = useState<Snippets | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [expandedSnippet, setExpandedSnippet] = useState<string | null>(null);

  useEffect(() => {
    loadPages();
    loadSnippets();
  }, []);

  const loadPages = async () => {
    try {
      const res = await fetch('/api/html-store');
      const data = await res.json();
      if (data.pages) setPages(data.pages);
    } catch (error) {
      console.error('Failed to load pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSnippets = async () => {
    try {
      const res = await fetch('/api/html-store/snippets');
      const data = await res.json();
      if (data.snippets) setSnippets(data.snippets);
    } catch (error) {
      console.error('Failed to load snippets:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name.replace('.html', ''));
    formData.append('storeId', 'temp-store-id'); // This should come from context/auth
    formData.append('isHomePage', String(pages.length === 0));

    try {
      const res = await fetch('/api/html-store/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        await loadPages();
        alert('File uploaded successfully!');
      } else {
        const error = await res.json();
        alert(`Upload failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;

    try {
      const res = await fetch(`/api/html-store?id=${pageId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await loadPages();
      } else {
        alert('Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const togglePublish = async (pageId: string, currentState: boolean) => {
    try {
      const res = await fetch(`/api/html-store/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !currentState }),
      });

      if (res.ok) {
        await loadPages();
      }
    } catch (error) {
      console.error('Toggle publish error:', error);
    }
  };

  const copySnippet = (snippet: string, name: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(name);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <BackButton />
        <h1 className="text-3xl font-bold mb-2">HTML Store</h1>
        <p className="text-gray-600">
          Upload and manage custom HTML pages for your store
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Upload HTML Page</h2>
        <label className="block">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 cursor-pointer transition">
            <FileCode className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">
              {uploading ? 'Uploading...' : 'Drop your HTML file here or click to browse'}
            </p>
            <p className="text-sm text-gray-500">Accepts .html files only</p>
            <input
              type="file"
              accept=".html"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </div>
        </label>
      </div>

      {/* Pages List */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">My HTML Pages</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Page Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No pages uploaded yet. Upload your first HTML page above.
                  </td>
                </tr>
              ) : (
                pages.map((page) => (
                  <tr key={page.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{page.name}</span>
                        {page.isHomePage && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            Home
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">/{page.slug}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => togglePublish(page.id, page.isPublished)}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded text-sm font-medium ${
                          page.isPublished
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {page.isPublished ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {page.isPublished ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(page.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(page.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Embed Snippets */}
      {snippets && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Embed Snippets</h2>
            <p className="text-sm text-gray-600 mt-1">
              Add these snippets to your HTML pages to enable features
            </p>
          </div>
          <div className="divide-y">
            {Object.entries(snippets).map(([key, value]) => (
              <div key={key} className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setExpandedSnippet(expandedSnippet === key ? null : key)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {expandedSnippet === key ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => copySnippet(value, key)}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      {copiedSnippet === key ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {expandedSnippet === key && (
                  <pre className="mt-2 p-4 bg-gray-50 rounded text-xs overflow-x-auto">
                    <code>{value}</code>
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
