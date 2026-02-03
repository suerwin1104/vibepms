import { Staff } from '../types/staff.types';

/**
 * 判斷單據可見性權限
 * - GroupAdmin: 可看所有單據
 * - 主管: 可看自己及下屬的單據
 * - 一般員工: 僅看自己的單據
 */

/**
 * 判斷使用者是否可以查看某單據
 */
export function canViewDocument(
    currentUser: Staff | null,
    requesterId: string,
    allStaff: Staff[]
): boolean {
    if (!currentUser) return false;

    // GroupAdmin 可看所有
    if (currentUser.role === 'GroupAdmin') return true;

    // 自己的單據
    if (requesterId === currentUser.id) return true;
    if (requesterId === currentUser.name) return true; // 有些舊資料用名字

    // 下屬的單據 (直屬主管)
    const subordinates = allStaff.filter(s => s.supervisorId === currentUser.id);
    if (subordinates.some(s => s.id === requesterId || s.name === requesterId)) return true;

    return false;
}

/**
 * 取得使用者可見的申請人 ID 及名字列表
 * @returns 'all' 表示可看所有，否則返回可見的 ID/Name 陣列
 */
export function getVisibleRequesterIds(
    currentUser: Staff | null,
    allStaff: Staff[]
): { ids: string[], names: string[] } | 'all' {
    if (!currentUser) return { ids: [], names: [] };

    if (currentUser.role === 'GroupAdmin') return 'all';

    const ids: string[] = [currentUser.id];
    const names: string[] = [currentUser.name];

    // 加入下屬
    allStaff.filter(s => s.supervisorId === currentUser.id).forEach(s => {
        ids.push(s.id);
        names.push(s.name);
    });

    return { ids, names };
}

/**
 * 過濾單據陣列，僅返回使用者可見的單據
 */
export function filterDocumentsByPermission<T extends { requesterId?: string; requesterName?: string }>(
    documents: T[],
    currentUser: Staff | null,
    allStaff: Staff[]
): T[] {
    const visible = getVisibleRequesterIds(currentUser, allStaff);

    if (visible === 'all') return documents;

    return documents.filter(doc => {
        if (doc.requesterId && visible.ids.includes(doc.requesterId)) return true;
        if (doc.requesterName && visible.names.includes(doc.requesterName)) return true;
        return false;
    });
}
