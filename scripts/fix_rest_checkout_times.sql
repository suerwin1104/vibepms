-- 修正「當日休息訂單但退房時間早於或等於入住時間」的資料
-- 這些是設定錯誤的訂單，例如：入住 18:00，退房 11:00
-- 修正方式：將退房時間設為「現在時間 + 3 小時」
-- 確認受影響的訂單 (預覽)
SELECT id,
    guest_name,
    room_number,
    check_in,
    check_out,
    status
FROM reservations
WHERE status IN ('Confirmed', 'CheckedIn')
    AND check_in::date = check_out::date -- 同一天 (休息訂單)
    AND check_out::timestamp <= check_in::timestamp;
-- 退房時間早於或等於入住時間
-- 執行修正：將退房時間設為「入住時間 + 3 小時」
UPDATE reservations
SET check_out = to_char(
        check_in::timestamp + interval '3 hours',
        'YYYY-MM-DD HH24:MI'
    )
WHERE status IN ('Confirmed', 'CheckedIn')
    AND check_in::date = check_out::date
    AND check_out::timestamp <= check_in::timestamp;
-- 驗證修正結果
SELECT id,
    guest_name,
    room_number,
    check_in,
    check_out,
    status,
    CASE
        WHEN check_out::timestamp > check_in::timestamp THEN '✓ 已修正'
        ELSE '✗ 仍有問題'
    END AS fix_status
FROM reservations
WHERE status IN ('Confirmed', 'CheckedIn')
    AND check_in::date = check_out::date;