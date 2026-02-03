import React from 'react';
import { ChartOfAccount, AccountType } from '../types';

interface AccountCodeSelectProps {
    accounts: ChartOfAccount[];
    value: string;
    onChange: (code: string, accountId?: string) => void;
    filterType?: AccountType | AccountType[];
    placeholder?: string;
    disabled?: boolean;
    showCode?: boolean;
    style?: React.CSSProperties;
    className?: string;
}

/**
 * 會計科目選擇下拉選單元件
 * 可用於庫存管理、採購管理、零用金等模組
 */
const AccountCodeSelect: React.FC<AccountCodeSelectProps> = ({
    accounts,
    value,
    onChange,
    filterType,
    placeholder = '選擇會計科目',
    disabled = false,
    showCode = true,
    style,
    className
}) => {
    // 篩選啟用中的科目
    let filteredAccounts = accounts.filter(a => a.isActive);

    // 依類型篩選
    if (filterType) {
        const types = Array.isArray(filterType) ? filterType : [filterType];
        filteredAccounts = filteredAccounts.filter(a => types.includes(a.type));
    }

    // 依科目代碼排序
    filteredAccounts.sort((a, b) => a.code.localeCompare(b.code));

    // 依類型分組
    const groupedAccounts = filteredAccounts.reduce((groups, account) => {
        const type = account.type;
        if (!groups[type]) {
            groups[type] = [];
        }
        groups[type].push(account);
        return groups;
    }, {} as Record<AccountType, ChartOfAccount[]>);

    const typeLabels: Record<AccountType, string> = {
        Asset: '資產',
        Liability: '負債',
        Equity: '權益',
        Revenue: '收入',
        Expense: '費用'
    };

    const typeOrder: AccountType[] = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedCode = e.target.value;
        const selectedAccount = accounts.find(a => a.code === selectedCode);
        onChange(selectedCode, selectedAccount?.id);
    };

    const defaultStyle: React.CSSProperties = {
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid #d1d5db',
        fontSize: '14px',
        width: '100%',
        backgroundColor: disabled ? '#f3f4f6' : 'white',
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style
    };

    return (
        <select
            value={value || ''}
            onChange={handleChange}
            disabled={disabled}
            style={defaultStyle}
            className={className}
        >
            <option value="">{placeholder}</option>
            {typeOrder.map(type => {
                const typeAccounts = groupedAccounts[type];
                if (!typeAccounts || typeAccounts.length === 0) return null;

                return (
                    <optgroup key={type} label={`── ${typeLabels[type]} ──`}>
                        {typeAccounts.map(account => (
                            <option key={account.id} value={account.code}>
                                {showCode ? `${account.code} - ${account.name}` : account.name}
                            </option>
                        ))}
                    </optgroup>
                );
            })}
        </select>
    );
};

export default AccountCodeSelect;
