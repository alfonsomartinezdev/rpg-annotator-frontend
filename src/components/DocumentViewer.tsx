import { useState, useEffect } from 'react';
import DocumentContent from './DocumentContent';
import type { DocumentData } from '../types';

const DocumentViewer = () => {
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<number | null>(null);
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

  const handleDocumentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    
    if (target.classList.contains('annotation')) {
      const annotationId = parseInt(target.getAttribute('data-id') || '0');
      setSelectedAnnotationId(selectedAnnotationId === annotationId ? null : annotationId);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="prose">
        {/* We need to inject inline annotations into the HTML */}
        <DocumentContent
          htmlContent={documentData.document.rendered_content}
          annotations={documentData.annotations}
          selectedAnnotationId={selectedAnnotationId}
          onAnnotationClick={handleDocumentClick}
        />
      </div>
    </div>
  )
}

export default DocumentViewer