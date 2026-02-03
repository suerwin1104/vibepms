import React, { useState, useEffect } from 'react';
import { AccountingService } from '../services/AccountingService';
import { AccountingPeriod, Hotel } from '../types';

interface AccountingPeriodManagementProps {
    selectedHotelId: string;
    currentUserId: string;
}

const AccountingPeriodManagement: React.FC<AccountingPeriodManagementProps> = ({ selectedHotelId, currentUserId }) => {
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchPeriods();
    }, [selectedHotelId, selectedYear]);

    const fetchPeriods = async () => {
        if (!selectedHotelId) return;
        setLoading(true);
        try {
            const data = await AccountingService.getPeriods(selectedHotelId);
            setPeriods(data);
        } catch (e) {
            console.error(e);
            alert('Failed to load periods');
        } finally {
            setLoading(false);
        }
    };

    const handleClosePeriod = async (period: string) => {
        if (!window.confirm(`Are you sure you want to close period ${period}? No more entries will be allowed.`)) return;

        try {
            const result = await AccountingService.closePeriod(selectedHotelId, period, 'Closed', currentUserId);
            if (result.success) {
                alert(result.message);
                fetchPeriods();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleReopenPeriod = async (period: string) => {
        if (!window.confirm(`WARNING: Re-opening period ${period} implies potential data modification. Continue?`)) return;

        try {
            const result = await AccountingService.closePeriod(selectedHotelId, period, 'Open', currentUserId);
            if (result.success) {
                alert(result.message);
                fetchPeriods();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleYearEnd = async () => {
        if (!window.confirm(`Perform Year End Closing for ${selectedYear}? This will generate closing entries and LOCK the entire year.`)) return;

        try {
            setLoading(true);
            const result = await AccountingService.performYearEndClosing(selectedHotelId, selectedYear, currentUserId);
            if (result.success) {
                alert(result.message);
                fetchPeriods();
            } else {
                alert('Year End Failed: ' + result.message);
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setLoading(false);
        }
    };

    // Generate 12 months for selected year
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    // Merge with DB data
    const getPeriodStatus = (year: number, month: number) => {
        const periodStr = `${year}-${String(month).padStart(2, '0')}`;
        const found = periods.find(p => p.period === periodStr);
        return found ? found : { status: 'Open', period: periodStr }; // Default Open if not exists
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Accounting Periods & Closing</h2>
                <div className="flex items-center gap-4">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="border p-2 rounded"
                    >
                        <option value={2024}>2024</option>
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                        <option value={2027}>2027</option>
                    </select>

                    <button
                        onClick={handleYearEnd}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                        Run Year End Close
                    </button>
                </div>
            </div>

            {loading ? <p>Loading...</p> : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closed By</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closed At</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {months.map(month => {
                                const pData: any = getPeriodStatus(selectedYear, month);
                                const isClosed = pData.status === 'Closed' || pData.status === 'Locked';
                                const isLocked = pData.status === 'Locked';

                                return (
                                    <tr key={month}>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                            {pData.period}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${pData.status === 'Open' ? 'bg-green-100 text-green-800' :
                                                    pData.status === 'Closed' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-800'}`}>
                                                {pData.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {pData.closedBy || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {pData.closedAt ? new Date(pData.closedAt).toLocaleString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            {isClosed ? (
                                                !isLocked && (
                                                    <button
                                                        onClick={() => handleReopenPeriod(pData.period)}
                                                        className="text-indigo-600 hover:text-indigo-900"
                                                    >
                                                        Re-open
                                                    </button>
                                                )
                                            ) : (
                                                <button
                                                    onClick={() => handleClosePeriod(pData.period)}
                                                    className="text-orange-600 hover:text-orange-900"
                                                >
                                                    Close Month
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AccountingPeriodManagement;
