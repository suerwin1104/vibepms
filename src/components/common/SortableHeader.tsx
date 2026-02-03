import React from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
    key: string;
    direction: SortDirection;
}

interface SortableHeaderProps {
    label: string;
    sortKey: string;
    currentSort: SortConfig | null;
    onSort: (key: string) => void;
    className?: string;
    align?: 'left' | 'right' | 'center';
}

/**
 * 可排序的表格標題組件
 * 點擊切換排序方向：null -> asc -> desc -> null
 */
const SortableHeader: React.FC<SortableHeaderProps> = ({
    label,
    sortKey,
    currentSort,
    onSort,
    className = '',
    align = 'left'
}) => {
    const isActive = currentSort?.key === sortKey;
    const direction = isActive ? currentSort.direction : null;

    const handleClick = () => {
        onSort(sortKey);
    };

    const alignClass = align === 'right' ? 'text-right justify-end' : align === 'center' ? 'text-center justify-center' : 'text-left';

    return (
        <th
            className={`px-6 py-5 cursor-pointer select-none hover:bg-slate-100 transition-colors group ${className}`}
            onClick={handleClick}
        >
            <div className={`flex items-center gap-1.5 ${alignClass}`}>
                <span>{label}</span>
                <span className={`flex flex-col text-[8px] leading-none transition-colors ${isActive ? 'text-blue-500' : 'text-slate-300 group-hover:text-slate-400'}`}>
                    <span className={direction === 'asc' ? 'text-blue-600' : ''}>▲</span>
                    <span className={direction === 'desc' ? 'text-blue-600' : ''}>▼</span>
                </span>
            </div>
        </th>
    );
};

/**
 * 排序工具函數：根據 SortConfig 對陣列進行排序
 */
export function sortData<T>(data: T[], sortConfig: SortConfig | null, getFieldValue?: (item: T, key: string) => any): T[] {
    if (!sortConfig || !sortConfig.direction) {
        return data;
    }

    return [...data].sort((a, b) => {
        let aVal: any, bVal: any;

        if (getFieldValue) {
            aVal = getFieldValue(a, sortConfig.key);
            bVal = getFieldValue(b, sortConfig.key);
        } else {
            aVal = (a as any)[sortConfig.key];
            bVal = (b as any)[sortConfig.key];
        }

        // Handle null/undefined
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return sortConfig.direction === 'asc' ? 1 : -1;
        if (bVal == null) return sortConfig.direction === 'asc' ? -1 : 1;

        // Handle different types
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        if (aVal instanceof Date && bVal instanceof Date) {
            return sortConfig.direction === 'asc'
                ? aVal.getTime() - bVal.getTime()
                : bVal.getTime() - aVal.getTime();
        }

        // String comparison
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();

        if (sortConfig.direction === 'asc') {
            return aStr.localeCompare(bStr, 'zh-TW');
        } else {
            return bStr.localeCompare(aStr, 'zh-TW');
        }
    });
}

/**
 * Hook: 管理排序狀態
 */
export function useSortableData<T>(data: T[], getFieldValue?: (item: T, key: string) => any) {
    const [sortConfig, setSortConfig] = React.useState<SortConfig | null>(null);

    const handleSort = (key: string) => {
        setSortConfig(prev => {
            if (prev?.key !== key) {
                return { key, direction: 'asc' };
            }
            if (prev.direction === 'asc') {
                return { key, direction: 'desc' };
            }
            if (prev.direction === 'desc') {
                return null;
            }
            return { key, direction: 'asc' };
        });
    };

    const sortedData = React.useMemo(() => {
        return sortData(data, sortConfig, getFieldValue);
    }, [data, sortConfig, getFieldValue]);

    return { sortedData, sortConfig, handleSort };
}

export default SortableHeader;
