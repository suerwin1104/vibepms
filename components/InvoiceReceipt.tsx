import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Invoice, Hotel, Reservation, Guest } from '../types';

interface InvoiceReceiptProps {
  invoice: Invoice;
  hotel: Hotel;
  reservation?: Reservation;
  guest?: Guest;
  layout: 'A4' | 'POS';
  printConfig?: {
    printerWidth?: '58mm' | '80mm';
    showLogo?: boolean;
    autoPrint?: boolean;
  };
}

const InvoiceReceipt: React.FC<InvoiceReceiptProps> = ({ invoice, hotel, reservation, guest, layout }) => {
  const isVoided = invoice.status === 'Voided';
  const hasTaxId = !!invoice.buyerId; // Check if there's a Business Tax ID (Uniform Invoice Number)

  // Format Date: 113年05-06月 (Republic of China Year)
  // Taiwan e-invoices are usually bi-monthly (e.g., 05-06)
  let invoiceDate = new Date(invoice.createdAt);

  // Robust fallback for legacy format (e.g., "2026/1/13 下午3:39:46") or invalid dates
  if (isNaN(invoiceDate.getTime())) {
    // Try to parse legacy string roughly or fallback to now/raw string
    // Legacy format usually starts with YYYY/M/D
    const parts = invoice.createdAt.split(' ')[0].split('/');
    if (parts.length === 3) {
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]) - 1;
      const d = parseInt(parts[2]);
      invoiceDate = new Date(y, m, d);
    } else {
      invoiceDate = new Date(); // Fallback to now if completely unparseable
    }
  }

  const rocYear = invoiceDate.getFullYear() - 1911;
  const month = invoiceDate.getMonth() + 1;

  // Logic: 1,2 -> 01-02; 3,4 -> 03-04; ...
  const endMonth = Math.ceil(month / 2) * 2;
  const startMonth = endMonth - 1;
  const periodMonthStr = `${startMonth.toString().padStart(2, '0')}-${endMonth.toString().padStart(2, '0')}`;

  // Format Time: Handle both ISO and legacy
  let dateTimeStr = "";
  try {
    dateTimeStr = new Date(invoice.createdAt).toLocaleString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).replace(/\//g, '-');
    if (dateTimeStr === "Invalid Date") throw new Error("Invalid");
  } catch (e) {
    // Legacy Fallback: just show the raw string or parsed
    dateTimeStr = invoice.createdAt;
  }

  // Format details
  const randomCode = '9999'; // Placeholder for 4-digit random code
  const sellerId = '88889999'; // Placeholder for Seller Tax ID if not in hotel object

  return (
    <div
      id="printable-invoice"
      className={`print-receipt-container bg-white text-black ${layout === 'POS' ? 'pos-layout' : 'a4-layout'}`}
    >
      <style>{`
        /* Screen Styles: Hide but keep in DOM */
        @media screen {
          .print-receipt-container {
            position: absolute !important;
            left: -9999px !important;
            top: -9999px !important;
            height: 1px !important;
            width: 1px !important;
            overflow: hidden !important;
            opacity: 0 !important;
          }
        }

        /* Print Styles */
        @media print {
          /* Hide everything by default using visibility */
          body * {
            visibility: hidden;
          }
          
          /* Only show the invoice container and its children */
          #printable-invoice, #printable-invoice * {
            visibility: visible;
          }
          
          .no-print, nav, aside { display: none !important; }
          
          #printable-invoice {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important; /* Ensure opaque background */
            z-index: 9999999 !important;
            min-height: 100vh; /* Optional: force height to cover if needed, but visibility hidden is safer */
          }

          body, #root, main {
            overflow: visible !important;
          }
          
          /* POS Layout: 5.7cm Standard Electronic Invoice */
          .pos-layout {
            width: 57mm !important; /* Standard 5.7cm width */
            padding: 2mm 1mm !important; /* Minimal padding */
            font-family: "Courier New", Courier, monospace !important; /* Monospace for alignment */
            font-size: 9pt !important;
            line-height: 1.2 !important;
            text-align: center;
          }
          
          /* Title Block */
          .invoice-title {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 2mm;
          }
          
          .invoice-period {
            font-size: 20pt; /* Large font for Year-Month */
            font-weight: bold;
            margin: 2mm 0;
            line-height: 1;
          }
          
          .invoice-number {
            font-size: 20pt; /* Large font for Invoice Number */
            font-weight: bold;
            margin-bottom: 2mm;
            line-height: 1;
            letter-spacing: 1px;
          }
          
          .meta-info {
            font-size: 9pt;
            text-align: left;
            margin-left: 2mm;
            line-height: 1.4;
          }

          /* Barcode Simulation */
          .barcode-1d {
            height: 8mm;
            width: 90%;
            margin: 2mm auto;
            background: repeating-linear-gradient(
              90deg,
              #000,
              #000 1px,
              #fff 1px,
              #fff 3px
            );
          }
          
          .qr-container {
            display: flex;
            justify-content: space-between;
            padding: 0 4mm;
            margin: 3mm 0;
          }
          
          .qr-code {
            width: 18mm;
            height: 18mm;
            /* border: 1px solid #000; Removed for actual QR code */
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .details-block {
            text-align: left;
            font-size: 8pt;
            border-top: 1px dashed #000;
            padding-top: 2mm;
            margin-top: 2mm;
          }
          
          /* A4 Layout (Legacy/Full) */
          .a4-layout {
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 15mm !important;
            font-size: 11pt !important;
          }
        }
      `}</style>

      {/* ============== POS LAYOUT (5.7cm) ============== */}
      {layout === 'POS' ? (
        <div>
          {/* Logo / Company Name */}
          <div className="font-bold text-[10pt] mb-2">{hotel.name}</div>

          {/* Title */}
          <div className="invoice-title">電子發票證明聯</div>

          {/* Year-Month (e.g. 113年05-06月) */}
          <div className="invoice-period">
            {rocYear}年{periodMonthStr}月
          </div>

          {/* Invoice Number (e.g. AB-12345678) */}
          <div className="invoice-number">
            {invoice.invoiceNumber}
          </div>

          {/* Meta Info */}
          <div className="meta-info font-mono">
            <div>{dateTimeStr}</div>
            <div className="flex">
              <span className="w-1/2">隨機碼 {randomCode}</span>
              <span className="w-1/2">總計 ${invoice.amount}</span>
            </div>
            <div className="flex">
              <span className="w-1/2">賣方{sellerId}</span>
              <span className="w-1/2">買方{invoice.buyerId || '00000000'}</span>
            </div>
          </div>

          {/* Barcode (Code39) Placeholder */}
          <div className="barcode-1d" />

          {/* QR Codes (Left/Right) Placeholder */}
          <div className="qr-container">
            <div className="qr-code">
              <QRCodeSVG value={`${invoice.invoiceNumber}-LEFT`} size={64} level="L" />
            </div>
            <div className="qr-code">
              <QRCodeSVG value={`${invoice.invoiceNumber}-RIGHT`} size={64} level="L" />
            </div>
          </div>

          {/* Business Format Details (Only if Tax ID Present) */}
          {hasTaxId ? (
            <div className="details-block">
              <p>統一編號: {invoice.buyerId}</p>
              <p>買受人: {guest?.name || invoice.buyerId}</p>
              <div className="mt-2 text-[7pt]">
                <p>品名: 住宿費</p>
                <p>數量: 1</p>
                <p>單價: {invoice.netAmount}</p>
                <p>金額: {invoice.netAmount}</p>
                <p>稅額: {invoice.tax}</p>
                <p>總計: {invoice.amount}</p>
              </div>
            </div>
          ) : (
            <div className="details-block text-center text-[7pt]">
              *** 退貨請憑電子發票證明聯辦理 ***
            </div>
          )}

          {isVoided && <div className="font-bold text-xl my-2 border-2 border-black p-1 rotate-[-10deg]">VOID / 作廢</div>}
        </div>
      ) : (
        /* ============== A4 LAYOUT (Legacy) ============== */
        /* ============== A4 LAYOUT (Standard) ============== */
        <div className="relative p-8 h-full">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-slate-900 text-white rounded flex items-center justify-center font-bold text-xl">H</div>
                <h1 className="text-3xl font-black uppercase tracking-tight">{hotel.name}</h1>
              </div>
              <p className="text-slate-600 max-w-sm text-sm">{hotel.address || 'Hotel Address Line 1, City, Country'}</p>
              <p className="text-slate-600 text-sm mt-1">TEL: {hotel.phone || '+886 2 2345 6789'}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-black text-slate-200 uppercase tracking-widest mb-2">INVOICE</div>
              <p className="font-mono text-xl font-bold">{invoice.invoiceNumber}</p>
              <p className="text-slate-500 font-mono">{dateTimeStr}</p>
            </div>
          </div>

          {/* Bill To / Info */}
          <div className="grid grid-cols-2 gap-12 mb-10">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Bill To</p>
              <h2 className="text-xl font-bold text-slate-900">{guest?.name || invoice.buyerId || 'Guest'}</h2>
              {invoice.buyerId && <p className="font-mono text-slate-600">Tax ID: {invoice.buyerId}</p>}
              <p className="text-slate-500 text-sm mt-1">{guest?.email}</p>
              <p className="text-slate-500 text-sm">{guest?.phone}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Booking Details</p>
              <p className="font-bold text-slate-900">Room: {reservation?.roomNumber || 'N/A'}</p>
              <p className="text-slate-600 text-sm">Res ID: {reservation?.id}</p>
              <p className="text-slate-600 text-sm">Check-in: {reservation?.checkIn}</p>
              <p className="text-slate-600 text-sm">Check-out: {reservation?.checkOut}</p>
            </div>
          </div>

          {/* Table */}
          <table className="w-full mb-10">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-2 font-bold text-slate-600 text-sm uppercase">Item Description</th>
                <th className="text-center py-3 px-2 font-bold text-slate-600 text-sm uppercase w-24">Qty</th>
                <th className="text-right py-3 px-2 font-bold text-slate-600 text-sm uppercase w-32">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-4 px-2">
                  <p className="font-bold text-slate-800">Room Charge</p>
                  <p className="text-sm text-slate-500 italic">Accommodation Services</p>
                </td>
                <td className="py-4 px-2 text-center font-mono text-slate-600">1</td>
                <td className="py-4 px-2 text-right font-mono font-bold text-slate-800">${invoice.netAmount.toLocaleString()}</td>
              </tr>
              <tr>
                <td className="py-4 px-2">
                  <p className="font-bold text-slate-800">Tax (VAT 5%)</p>
                </td>
                <td className="py-4 px-2 text-center font-mono text-slate-600">-</td>
                <td className="py-4 px-2 text-right font-mono font-bold text-slate-800">${invoice.tax.toLocaleString()}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-900">
                <td colSpan={2} className="pt-4 text-right font-black text-slate-900 uppercase pr-8 text-lg">Total Amount</td>
                <td className="pt-4 text-right font-black text-2xl text-blue-600 font-mono">${invoice.amount.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 w-full p-8 border-t border-slate-100">
            <div className="flex justify-between items-end">
              <div className="text-xs text-slate-400 max-w-md">
                <p>Thank you for choosing {hotel.name}.</p>
                <p>Please retain this invoice for your records.</p>
              </div>
              <div className="text-center">
                <div className="h-16 border-b border-slate-300 w-48 mb-2"></div>
                <p className="text-xs font-bold text-slate-400 uppercase">Authorized Signature</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceReceipt;
