export interface Annotation {
  id: number;
  fragment: string;
  annotation_text: string;
  author: string;
  created_at: string;
}

export interface DocumentData {
  document: {
    id: number;
    title: string;
    rendered_content: string;
    author: string;
  };
  annotations: Annotation[];
}