import type { Annotation } from "../types";

interface InlineAnnotationProps {
  annotation: Annotation;
  onEdit: (annotation: Annotation) => void;
}

const InlineAnnotation = ({ annotation, onEdit }: InlineAnnotationProps) => {
  const handleEditClick = (event: React.MouseEvent) => {
    event.preventDefault();
    onEdit(annotation);
  };

  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 my-4 rounded-r-lg">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-amber-800">Your note:</h4>
        <button 
          onClick={handleEditClick}
          className="text-amber-600 hover:text-amber-800 text-sm"
        >
          Edit
        </button>
      </div>
      <p className="text-gray-700 mb-2">{annotation.annotation_text}</p>
      <div className="text-xs text-gray-500">
        By: {annotation.author} • {new Date(annotation.created_at).toLocaleDateString()}
      </div>
    </div>
  );
};

export default InlineAnnotation;