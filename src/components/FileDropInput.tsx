"use client";

import { useRef, useState, type DragEvent } from "react";

export default function FileDropInput({
  id,
  name,
  accept,
}: {
  id: string;
  name: string;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    const files = event.dataTransfer.files;
    if (files.length > 0 && inputRef.current) {
      inputRef.current.files = files;
      setFileName(files[0].name);
    }
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
      }}
      className={`cursor-pointer rounded-sm border border-dashed px-4 py-5 text-center text-xs transition-colors ${
        isDragging ? "border-gold bg-gold/5" : "border-nude hover:border-gold/60"
      }`}
    >
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
      />
      {fileName ? (
        <p className="truncate text-charcoal">{fileName}</p>
      ) : (
        <p className="text-charcoal/50">클릭하거나 파일을 끌어다 놓으세요</p>
      )}
    </div>
  );
}
