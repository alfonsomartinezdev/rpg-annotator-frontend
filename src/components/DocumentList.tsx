// components/DocumentList.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText} from 'lucide-react';
import { API_BASE } from '../constants';

interface Document {
  id: number;
  title: string;
  author: string;
  created_at: string;
}

const DocumentList = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/documents`);
        const data = await res.json();
        setDocuments(data);
      } catch (err) {
        console.error("Failed to fetch documents:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  if (loading) return <div className="max-w-4xl mx-auto p-6">Loading documents...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Document Library</h1>
      
      <div className="space-y-4">
        {documents.map((doc) => (
          <Link
            key={doc.id}
            to={`/document/${doc.id}`}
            className="block border border-gray-200 p-6 hover:bg-amber-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <FileText className="w-6 h-6 text-gray-600" />
              </div>
              
              <div className="flex-grow min-w-0">
                <h2 className="text-xl font-semibold text-gray-900">
                  {doc.title}
                </h2>
              </div>
            </div>
          </Link>
        ))}
        
        {documents.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No documents found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentList;