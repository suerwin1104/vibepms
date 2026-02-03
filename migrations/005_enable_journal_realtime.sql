-- 啟用 journal_entries 資料表的 Realtime 功能
-- 讓傳票資料能夠跨瀏覽器即時同步
-- 方法 1: 透過 SQL 啟用 Realtime
-- 這會讓所有對 journal_entries 表的 INSERT, UPDATE, DELETE 操作都能即時廣播
ALTER PUBLICATION supabase_realtime
ADD TABLE journal_entries;
-- 如果上述命令報錯說表已存在，可以忽略
-- 確認 Realtime 已啟用
SELECT *
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';