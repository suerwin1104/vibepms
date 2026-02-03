import React from 'react';
import { JournalEntry, ChartOfAccount } from '../../types';

interface JournalVoucherPrintProps {
    entry: JournalEntry;
    accounts: ChartOfAccount[];
    hotelName?: string;
    onClose: () => void;
}

const JournalVoucherPrint: React.FC<JournalVoucherPrintProps> = ({
    entry,
    accounts,
    hotelName = '飯店管理系統',
    onClose
}) => {
    const handlePrint = () => {
        window.print();
    };

    const statusLabels: Record<string, string> = {
        Draft: '草稿',
        Pending: '待審核',
        Posted: '已過帳',
        Voided: '已作廢'
    };

    const totalDebit = entry.lines?.reduce((sum, l) => sum + (l.debitAmount || 0), 0) || entry.totalDebit || 0;
    const totalCredit = entry.lines?.reduce((sum, l) => sum + (l.creditAmount || 0), 0) || entry.totalCredit || 0;

    // 數字轉中文大寫
    const numberToChinese = (num: number): string => {
        if (num === 0) return '零元整';
        const digits = ['零', '壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖'];
        const units = ['', '拾', '佰', '仟'];
        const bigUnits = ['', '萬', '億', '兆'];

        const intPart = Math.floor(num);
        let result = '';
        let unitIndex = 0;
        let temp = intPart;

        while (temp > 0) {
            const section = temp % 10000;
            let sectionStr = '';
            let sectionTemp = section;
            let pos = 0;

            while (sectionTemp > 0) {
                const digit = sectionTemp % 10;
                if (digit !== 0) {
                    sectionStr = digits[digit] + units[pos] + sectionStr;
                } else if (sectionStr && !sectionStr.startsWith('零')) {
                    sectionStr = '零' + sectionStr;
                }
                sectionTemp = Math.floor(sectionTemp / 10);
                pos++;
            }

            if (sectionStr) {
                result = sectionStr + bigUnits[unitIndex] + result;
            }

            temp = Math.floor(temp / 10000);
            unitIndex++;
        }

        return result + '元整';
    };

    return (
        <div className="journal-voucher-print-overlay">
            {/* Print Styles */}
            <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .journal-voucher-print-overlay,
          .journal-voucher-print-overlay * {
            visibility: visible;
          }
          .journal-voucher-print-overlay {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .voucher-container {
            box-shadow: none !important;
            border: 2px solid #000 !important;
          }
        }
        
        .journal-voucher-print-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
          overflow: auto;
        }
        
        .voucher-container {
          background: white;
          width: 210mm;
          min-height: 148mm;
          padding: 20mm;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          font-family: 'Noto Sans TC', 'Microsoft JhengHei', sans-serif;
        }
        
        .voucher-header {
          text-align: center;
          border-bottom: 3px double #000;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        
        .voucher-title {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: 8px;
          margin: 0;
        }
        
        .voucher-subtitle {
          font-size: 14px;
          color: #666;
          margin-top: 5px;
        }
        
        .voucher-meta {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 20px;
          font-size: 13px;
        }
        
        .voucher-meta-item {
          display: flex;
          gap: 8px;
        }
        
        .voucher-meta-label {
          font-weight: 600;
          color: #333;
          min-width: 70px;
        }
        
        .voucher-meta-value {
          font-family: monospace;
        }
        
        .voucher-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        
        .voucher-table th,
        .voucher-table td {
          border: 1px solid #000;
          padding: 10px 12px;
          text-align: left;
        }
        
        .voucher-table th {
          background-color: #f5f5f5;
          font-weight: 600;
          font-size: 13px;
          text-align: center;
        }
        
        .voucher-table td {
          font-size: 13px;
        }
        
        .voucher-table .text-right {
          text-align: right;
          font-family: monospace;
        }
        
        .voucher-table .text-center {
          text-align: center;
        }
        
        .voucher-table tfoot td {
          font-weight: 700;
          background-color: #fafafa;
        }
        
        .voucher-amount-words {
          border: 1px solid #000;
          padding: 12px 15px;
          margin-bottom: 20px;
          display: flex;
          gap: 10px;
        }
        
        .voucher-amount-words-label {
          font-weight: 600;
          white-space: nowrap;
        }
        
        .voucher-amount-words-value {
          flex: 1;
          border-bottom: 1px dashed #999;
          font-size: 14px;
        }
        
        .voucher-signatures {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0;
          border: 1px solid #000;
          margin-top: 30px;
        }
        
        .voucher-signature-box {
          padding: 10px;
          text-align: center;
          border-right: 1px solid #000;
          min-height: 80px;
        }
        
        .voucher-signature-box:last-child {
          border-right: none;
        }
        
        .voucher-signature-label {
          font-size: 12px;
          font-weight: 600;
          border-bottom: 1px solid #ddd;
          padding-bottom: 8px;
          margin-bottom: 10px;
        }
        
        .voucher-signature-name {
          font-size: 14px;
          min-height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .print-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 20px;
        }
        
        .print-btn {
          padding: 12px 32px;
          font-size: 15px;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .print-btn-primary {
          background-color: #3b82f6;
          color: white;
        }
        
        .print-btn-primary:hover {
          background-color: #2563eb;
        }
        
        .print-btn-secondary {
          background-color: #6b7280;
          color: white;
        }
        
        .print-btn-secondary:hover {
          background-color: #4b5563;
        }
      `}</style>

            <div>
                <div className="voucher-container">
                    {/* Header */}
                    <div className="voucher-header">
                        <h1 className="voucher-title">記 帳 傳 票</h1>
                        <div className="voucher-subtitle">{hotelName}</div>
                    </div>

                    {/* Meta Information */}
                    <div className="voucher-meta">
                        <div className="voucher-meta-item">
                            <span className="voucher-meta-label">傳票編號:</span>
                            <span className="voucher-meta-value">{entry.entryNumber}</span>
                        </div>
                        <div className="voucher-meta-item">
                            <span className="voucher-meta-label">傳票日期:</span>
                            <span className="voucher-meta-value">{entry.entryDate}</span>
                        </div>
                        <div className="voucher-meta-item">
                            <span className="voucher-meta-label">會計期間:</span>
                            <span className="voucher-meta-value">{entry.period}</span>
                        </div>
                        <div className="voucher-meta-item">
                            <span className="voucher-meta-label">傳票狀態:</span>
                            <span className="voucher-meta-value">{statusLabels[entry.status] || entry.status}</span>
                        </div>
                        <div className="voucher-meta-item">
                            <span className="voucher-meta-label">來源類型:</span>
                            <span className="voucher-meta-value">{entry.sourceType || '手動輸入'}</span>
                        </div>
                        <div className="voucher-meta-item">
                            <span className="voucher-meta-label">製票人員:</span>
                            <span className="voucher-meta-value">{entry.createdByName || entry.createdBy || '-'}</span>
                        </div>
                    </div>

                    {/* Description */}
                    <div style={{ marginBottom: '15px', padding: '10px 15px', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                        <strong>摘要說明：</strong> {entry.description}
                    </div>

                    {/* Lines Table */}
                    <table className="voucher-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}>序號</th>
                                <th style={{ width: '100px' }}>會計科目代碼</th>
                                <th>會計科目名稱</th>
                                <th>摘要</th>
                                <th style={{ width: '120px' }}>借方金額</th>
                                <th style={{ width: '120px' }}>貸方金額</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entry.lines?.map((line, idx) => {
                                const account = accounts.find(a => a.id === line.accountId);
                                return (
                                    <tr key={idx}>
                                        <td className="text-center">{idx + 1}</td>
                                        <td className="text-center" style={{ fontFamily: 'monospace' }}>
                                            {line.accountCode || account?.code || '-'}
                                        </td>
                                        <td>{line.accountName || account?.name || '-'}</td>
                                        <td>{line.description || '-'}</td>
                                        <td className="text-right">
                                            {line.debitAmount > 0 ? `$${line.debitAmount.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="text-right">
                                            {line.creditAmount > 0 ? `$${line.creditAmount.toLocaleString()}` : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                            {/* Empty rows for padding if needed */}
                            {(entry.lines?.length || 0) < 5 && Array.from({ length: 5 - (entry.lines?.length || 0) }).map((_, idx) => (
                                <tr key={`empty-${idx}`}>
                                    <td>&nbsp;</td>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={4} className="text-right">合　　計</td>
                                <td className="text-right">${totalDebit.toLocaleString()}</td>
                                <td className="text-right">${totalCredit.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* Amount in Words */}
                    <div className="voucher-amount-words">
                        <span className="voucher-amount-words-label">金額大寫：</span>
                        <span className="voucher-amount-words-value">{numberToChinese(totalDebit)}</span>
                    </div>

                    {/* Signature Section */}
                    <div className="voucher-signatures">
                        <div className="voucher-signature-box">
                            <div className="voucher-signature-label">核准</div>
                            <div className="voucher-signature-name"></div>
                        </div>
                        <div className="voucher-signature-box">
                            <div className="voucher-signature-label">覆核</div>
                            <div className="voucher-signature-name"></div>
                        </div>
                        <div className="voucher-signature-box">
                            <div className="voucher-signature-label">會計</div>
                            <div className="voucher-signature-name"></div>
                        </div>
                        <div className="voucher-signature-box">
                            <div className="voucher-signature-label">出納</div>
                            <div className="voucher-signature-name"></div>
                        </div>
                        <div className="voucher-signature-box">
                            <div className="voucher-signature-label">製票</div>
                            <div className="voucher-signature-name">{entry.createdByName || entry.createdBy || ''}</div>
                        </div>
                    </div>
                </div>

                {/* Print Buttons - Hidden when printing */}
                <div className="print-buttons no-print">
                    <button className="print-btn print-btn-primary" onClick={handlePrint}>
                        🖨️ 列印傳票
                    </button>
                    <button className="print-btn print-btn-secondary" onClick={onClose}>
                        關閉預覽
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JournalVoucherPrint;
