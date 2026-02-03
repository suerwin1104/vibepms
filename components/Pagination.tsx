import React from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '20px' }}>
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                    padding: '8px 16px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    backgroundColor: currentPage === 1 ? '#f1f5f9' : 'white',
                    color: currentPage === 1 ? '#94a3b8' : '#334155',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '14px',
                    fontWeight: 500
                }}
            >
                上一頁
            </button>
            <span style={{ fontSize: '14px', color: '#475569', fontWeight: 500 }}>
                第 {currentPage} 頁 / 共 {totalPages} 頁
            </span>
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                    padding: '8px 16px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    backgroundColor: currentPage === totalPages ? '#f1f5f9' : 'white',
                    color: currentPage === totalPages ? '#94a3b8' : '#334155',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '14px',
                    fontWeight: 500
                }}
            >
                下一頁
            </button>
        </div>
    );
};

export default Pagination;
