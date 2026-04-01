import React, { useRef, useState } from 'react';
import { Building2, Download, Loader2 } from 'lucide-react';
import { Button } from '../components/shared';
import { useReactToPrint } from 'react-to-print';
import { DEMO_SPARQL_RESULTS, DEMO_LLM_NARRATIVE } from '../data/demoReport';
import { ReportDataView, MarkdownRenderer } from '../components/report';

const PRINT_PAGE_STYLE = `
  @page { size: A4 portrait; margin: 18mm 15mm 22mm 15mm; }
  @page {
    @top-center { content: "FiCR Fire Risk Audit — Demo Report"; font-size: 8pt; color: #94a3b8; font-family: ui-monospace, monospace; }
    @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 8pt; color: #94a3b8; font-family: ui-monospace, monospace; }
  }
  body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-size: 11pt; line-height: 1.5; color: #1e293b; }
  .no-print { display: none !important; }
`;

export const Report: React.FC = () => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isPrintPreparing, setIsPrintPreparing] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'FiCR_Demo_Report',
    pageStyle: PRINT_PAGE_STYLE,
    onBeforePrint: async () => {
      setIsPrintPreparing(true);
      await new Promise(r => setTimeout(r, 300));
    },
    onAfterPrint: () => setIsPrintPreparing(false),
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 sticky top-0 z-30 bg-white/95 backdrop-blur-sm print:static">
        <div className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-primary-600 p-2.5 rounded-lg text-white shadow-sm print:shadow-none">
              <Building2 size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Demo Report — Fire Risk Audit & Mitigation
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                示范报告 — 建筑消防风险审计与整改 (Source: ficr_demo.ttl)
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Pre-generated showcase. Use FiCR Agent to generate reports for your own buildings.
              </p>
            </div>
          </div>
          <div className="print:hidden">
            <Button variant="primary" size="sm" onClick={() => handlePrint()} disabled={isPrintPreparing}>
              {isPrintPreparing ? (
                <><Loader2 size={14} className="mr-1.5 animate-spin" />Preparing...</>
              ) : (
                <><Download size={14} className="mr-1.5" />Export PDF</>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main ref={printRef} className="max-w-6xl mx-auto px-6 py-10 space-y-10 font-sans">
        <ReportDataView results={DEMO_SPARQL_RESULTS} />

        {/* AI Analysis Narrative */}
        <div className="border-t-2 border-slate-200 pt-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            AI Analysis & Recommendations
          </h2>
          <div className="prose prose-neutral max-w-none">
            <MarkdownRenderer text={DEMO_LLM_NARRATIVE} />
          </div>
        </div>

        <footer className="text-center text-slate-400 text-xs py-8 border-t border-slate-100 mt-8 no-print">
          <p>Building Fire Risk Intelligence — Powered by FiCR Ontology & SPARQL Engine</p>
        </footer>
      </main>
    </div>
  );
};
