import { useState } from 'react';
import type { Annotation } from '../types';

interface AnnotationModalProps {
  annotation: Annotation;
  onClose: () => void;
  onSave: (annotation: Annotation) => void;
}

const AnnotationModal = ({ annotation, onClose, onSave }: AnnotationModalProps) => {
  const [annotationText, setAnnotationText] = useState(annotation.annotation_text);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const response = await fetch(`http://localhost:3000/api/v1/annotations/${annotation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          annotation: {
            annotation_text: annotationText
          }
        })
      });

      if (response.ok) {
        const updatedAnnotation = await response.json();
        onSave(updatedAnnotation);
      } else {
        console.error('Failed to update annotation');
      }
    } catch (error) {
      console.error('Error updating annotation:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
  <div className="fixed inset-0 bg-white/80 flex items-center justify-center p-4 z-50">
    <div className="bg-white shadow-xl max-w-lg w-full p-8 border-l-4 border-amber-400">
      <div className="flex justify-between items-start mb-6">
        <h3 className="text-xl font-medium text-gray-900">{annotation.fragment}</h3>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl"
        >
          ×
        </button>
      </div>
      
        <label className="block text-sm font-medium text-gray-800 mb-3">
          Your note:
        </label>
        <textarea
          value={annotationText}
          onChange={(e) => setAnnotationText(e.target.value)}
          className="w-full p-4 border border-gray-300 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
          rows={5}
          placeholder="Add your annotation..."
        />

      <div className="mb-8">
        <div className="text-sm text-gray-600">
          By: {annotation.author} • {new Date(annotation.created_at).toLocaleDateString()}
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          onClick={onClose}
          className="px-6 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !annotationText.trim()}
          className="px-6 py-2 bg-amber-400 text-gray-900 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  </div>
);
};

export default AnnotationModal;