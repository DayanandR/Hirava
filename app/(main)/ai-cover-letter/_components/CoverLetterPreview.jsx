"use client";

import MarkdownEditor from "@uiw/react-markdown-editor";
import React from "react";

const CoverLetterPreview = ({ content }) => {
  return (
    <div className="py-4">
      <MarkdownEditor value={content} preview="preview" height={700} />
    </div>
  );
};

export default CoverLetterPreview;
