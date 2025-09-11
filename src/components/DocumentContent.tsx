import type { Annotation } from "../types";
import { Edit3 } from 'lucide-react';

interface DocumentContentProps {
  htmlContent: string;
  annotations: Annotation[];
  selectedAnnotationId: number | null;
  onAnnotationClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onEditAnnotation: React.Dispatch<React.SetStateAction<Annotation | null>>;
}

const DocumentContent = ({
  htmlContent,
  annotations,
  selectedAnnotationId,
  onAnnotationClick,
  onEditAnnotation
}: 
DocumentContentProps) => {
  // Parse HTML and inject inline annotations after each annotation span
  const createContentWithInlineAnnotations = () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");

    const annotationSpans = doc.querySelectorAll(".annotation");
    annotationSpans.forEach((span) => {
      const annotationId = parseInt(span.getAttribute("data-id") || "0");

      // not a big fan of what we're doing here but I'm not sure what a better path forward is.
      if (selectedAnnotationId === annotationId) {
        const annotation = annotations.find((ann) => ann.id === annotationId);
        if (annotation) {
          const inlineDiv = doc.createElement("div");
          inlineDiv.className = "inline-annotation";
          inlineDiv.innerHTML = `
          <div class="bg-amber-50 border-l-4 border-amber-400 p-4 my-1">
            <div class="flex justify-between items-start mb-2">
              <div>
              <p class="text-gray-700 mb-2 mt-0">${annotation.annotation_text}</p>
            <div class="text-xs text-gray-500">
              By: ${annotation.author} • ${new Date(
            annotation.created_at
          ).toLocaleDateString()}
            </div>
              </div>
              <button class="cursor-pointer edit-btn text-amber-600 hover:text-amber-800 text-sm">Edit</button>
            </div>
            
          </div>
        `;

          // Find the closest block-level parent (p, li, div, etc.)
          const parentElement = span.closest(
            "p, li, div, h1, h2, h3, h4, h5, h6"
          );
          if (parentElement && parentElement.parentNode) {
            parentElement.parentNode.insertBefore(
              inlineDiv,
              parentElement.nextSibling
            );
          }
        }
      }
    });

    return doc.body.innerHTML;
  };

  const contentWithAnnotations = createContentWithInlineAnnotations();

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;

    if (target.classList.contains("edit-btn")) {
      event.preventDefault();
      const annotationId = selectedAnnotationId;
      const annotation = annotations.find((ann) => ann.id === annotationId);
      if (annotation) {
        onEditAnnotation(annotation);
      }
    } else {
      onAnnotationClick(event);
    }
  };

  return (
    <div
      dangerouslySetInnerHTML={{ __html: contentWithAnnotations }}
      onClick={handleClick}
    />
  );
};

export default DocumentContent;
