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
      className={`flex cursor-pointer items-center gap-3 rounded border px-4 py-3 text-xs transition-colors ${
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
      <span className="shrink-0 rounded-full bg-beige px-3 py-1 text-charcoal">파일 선택</span>
      {fileName ? (
        <span className="truncate text-charcoal">{fileName}</span>
      ) : (
        <span className="truncate text-charcoal/50">선택된 파일 없음 (끌어다 놓기 가능)</span>
      )}
    </div>
  );
}
