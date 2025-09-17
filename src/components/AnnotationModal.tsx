import { useEffect, useState } from "react";
import type { Annotation } from "../types";
import { X } from "lucide-react";
import { API_BASE } from "../constants";

interface AnnotationModalProps {
  annotation: Annotation;
  onClose: () => void;
  onSave: () => void;
  documentId: number;
  isNew: boolean;
}

const AnnotationModal = ({
  annotation,
  onClose,
  onSave,
  documentId,
  isNew,
}: AnnotationModalProps) => {
  const [annotationText, setAnnotationText] = useState(annotation.annotation_text);
  const [saving, setSaving] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let response: Response;

      if (isNew) {
        // CREATE
        response = await fetch(
          `${API_BASE}/api/v1/documents/${documentId}/annotations`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              annotation: {
                selection_text: annotation.selection_text,
                start_offset: annotation.start_offset,
                end_offset: annotation.end_offset,
                annotation_text: annotationText,
                author: annotation.author,
              },
            }),
          }
        );
      } else {
        // UPDATE
        response = await fetch(
          `${API_BASE}/api/v1/annotations/${annotation.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              annotation: {
                annotation_text: annotationText,
              },
            }),
          }
        );
      }

      if (response.ok) {
        onSave();
      } else {
        console.error("Failed to save annotation");
      }
    } catch (err) {
      console.error("Error saving annotation:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white/80 flex items-center justify-center p-4 z-50">
      <div className="bg-white shadow-xl max-w-lg w-full p-8 border-l-4 border-amber-400">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-xl font-medium text-gray-900">{annotation.selection_text}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            <X size={20} className="cursor-pointer" />
          </button>
        </div>

        <label className="block text-sm font-medium text-gray-800 mb-3">Your note:</label>
        <textarea
          value={annotationText}
          onChange={(e) => setAnnotationText(e.target.value)}
          className="w-full p-4 border border-gray-300 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
          rows={5}
          placeholder="Add your annotation..."
        />

        {!isNew && (
          <div className="mb-8 text-sm text-gray-600">
            By: {annotation.author} • {new Date(annotation.created_at).toLocaleDateString()}
          </div>
        )}

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
            {isNew ? "Create" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnotationModal;