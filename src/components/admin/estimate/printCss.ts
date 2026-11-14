// 인쇄할 때 견적서 문서만 나오게 하고, 각 장(표지·갑지·집계표·내역서)을 새 쪽에서 시작한다.
export const PRINT_CSS = `
.estimate-page { box-shadow: 0 1px 3px rgba(0,0,0,.08); border-radius: 12px; }
@media print {
  @page { size: A4; margin: 12mm; }
  body * { visibility: hidden; }
  .estimate-doc, .estimate-doc * { visibility: visible; }
  .estimate-doc { position: absolute; left: 0; top: 0; width: 100%; gap: 0 !important; }
  .estimate-page { box-shadow: none; border-radius: 0; max-width: none; padding: 0 !important; break-after: page; min-height: 0 !important; }
  .estimate-page:last-child { break-after: auto; }
  .no-print { display: none !important; }
  tr { break-inside: avoid; }
}
`;
