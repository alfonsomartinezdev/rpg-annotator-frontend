import { useState, useEffect } from 'react';

interface Annotation {
  id: number;
  fragment: string;
  annotation_text: string;
  author: string;
  created_at: string;
}

interface DocumentData {
  document: {
    id: number;
    title: string;
    rendered_content: string;
    author: string;
  };
  annotations: Annotation[];
}


const DocumentViewer = () => {
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3000/api/v1/documents/1')
      .then(res => res.json())
      .then(data => {
        setDocumentData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch document:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!documentData) return <div>Failed to load document</div>;


  return (
    <div className="max-w-4xl mx-auto p-6">
      <div 
        className="prose prose-lg"
        dangerouslySetInnerHTML={{ __html: documentData.document.rendered_content }}
      />
    </div>
  )
}

export default DocumentViewer