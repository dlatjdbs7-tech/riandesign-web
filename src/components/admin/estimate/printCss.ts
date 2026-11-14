// 인쇄할 때 견적서 문서만 나오게 하고, 각 장(표지·공사원가계산서·내역서)을 새 쪽에서 시작한다.
// 엑셀 견적서와 같이 모든 장을 가로 A4로 인쇄한다.
// (메뉴 등은 아예 빼고 감싸는 틀은 평평하게 만들어, 문서가 종이 너비 그대로 놓이게 한다)
export const PRINT_CSS = `
.estimate-page { box-shadow: 0 1px 3px rgba(0,0,0,.08); border-radius: 12px; }
@media print {
  @page { size: A4 landscape; margin: 9mm 0; }
  html, body { background: #fff !important; width: 297mm !important; }
  body *:not(:has(.estimate-doc)):not(.estimate-doc):not(.estimate-doc *) { display: none !important; }
  body *:has(.estimate-doc) { display: block !important; width: 297mm !important; max-width: none !important; margin: 0 !important; padding: 0 !important; min-height: 0 !important; background: none !important; box-shadow: none !important; }
  .estimate-doc { display: block !important; width: 297mm !important; }
  .estimate-doc, .estimate-doc * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .estimate-page { width: 297mm !important; max-width: none !important; box-shadow: none; border-radius: 0; margin: 0 !important; break-after: page; min-height: 0 !important; }
  .estimate-page:last-child { break-after: auto; }
  .estimate-land { height: 191mm; aspect-ratio: auto !important; }
  .estimate-page:not(.estimate-land) { padding: 0 14mm !important; }
  .estimate-land-flow td, .estimate-land-flow th { padding-top: 2px !important; padding-bottom: 2px !important; }
  .estimate-land-flow .grid > div { padding-top: 6px !important; padding-bottom: 6px !important; }
  .estimate-land-flow .grid > div > p:last-child { display: none; }
  .estimate-page:not(.estimate-land) .overflow-x-auto { overflow: visible !important; }
  .estimate-page table { min-width: 0 !important; }
  .no-print { display: none !important; }
  tr { break-inside: avoid; }
  thead { display: table-header-group; }
}
`;
