export interface Annotation {
  id: number;
  annotation_text: string;
  selection_text: string;
  start_offset: number;
  end_offset: number;
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