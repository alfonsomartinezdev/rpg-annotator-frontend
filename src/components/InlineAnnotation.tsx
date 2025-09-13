import { Pencil } from "lucide-react";
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
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 my-4 rounded-r-lg group">
      <div className="flex justify-between items-start mb-2">
        <p className="text-gray-700 mb-2 mt-0">{annotation.annotation_text}</p>
        <div>
          <button
            onClick={handleEditClick}
            className="text-amber-600 hover:text-indigo-500 p-2 text-sm hover:bg-indigo-100/30 cursor-pointer group-hover:opacity-100 md:group-hover:opacity-100 opacity-100 md:opacity-0 transition-opacity duration-200"
          >
            <Pencil size={20}/>
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        By: {annotation.author} •{" "}
        {new Date(annotation.created_at).toLocaleDateString()}
      </div>
    </div>
  );
};

export default InlineAnnotation;