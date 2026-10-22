'use client';

import { useEffect, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import type { Editor as TinyMceEditorInstance } from 'tinymce';
import { apiRequest } from '@/lib/api';

import 'tinymce/tinymce';
import 'tinymce/icons/default';
import 'tinymce/themes/silver';
import 'tinymce/models/dom';
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/link';
import 'tinymce/plugins/image';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/preview';
import 'tinymce/plugins/anchor';
import 'tinymce/plugins/searchreplace';
import 'tinymce/plugins/visualblocks';
import 'tinymce/plugins/code';
import 'tinymce/plugins/fullscreen';
import 'tinymce/plugins/insertdatetime';
import 'tinymce/plugins/media';
import 'tinymce/plugins/table';
import 'tinymce/plugins/help';
// Help loads this Resource dynamically unless it is bundled before editor init.
import 'tinymce/plugins/help/js/i18n/keynav/en';
import 'tinymce/plugins/wordcount';
import 'tinymce/skins/ui/oxide/skin.min.css';
import 'tinymce/skins/content/default/content.min.css';
import 'tinymce/skins/ui/oxide/content.min.css';

export default function TinyMceEditor({
  value,
  onChange,
  resetSignal,
  uploadPath = '/uploadimagesPost',
}: {
  value: string;
  onChange: (value: string) => void;
  resetSignal?: number;
  uploadPath?: '/uploadimagesPost' | '/uploadimagesNews';
}) {
  const editorRef = useRef<TinyMceEditorInstance | null>(null);

  useEffect(() => {
    if (resetSignal !== undefined) {
      editorRef.current?.setContent('');
    }
  }, [resetSignal]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <Editor
        apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY || 'no-api-key'}
        licenseKey="gpl"
        value={value}
        onInit={(_, editor) => {
          editorRef.current = editor;
        }}
        onEditorChange={(content) => onChange(content)}
        init={{
          height: 560,
          menubar: true,
          branding: false,
          promotion: false,
          skin: false,
          content_css: false,
          plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount',
          toolbar:
            'undo redo | blocks | bold italic underline forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media table | removeformat code preview fullscreen',
          automatic_uploads: true,
          images_upload_handler: async (blobInfo) => {
            const formData = new FormData();
            formData.append('file', blobInfo.blob(), blobInfo.filename());
            const result = await apiRequest<{ location?: string }>(uploadPath, { method: 'POST', body: formData });

            if (!result.ok || !result.data?.location) {
              throw new Error(result.message || 'Upload ảnh thất bại');
            }

            return result.data.location;
          },
        }}
      />
    </div>
  );
}
