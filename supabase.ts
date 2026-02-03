
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uybkdnhaqnjrpwyqrocp.supabase.co';
// 注意：sb_publishable 開頭的通常是 Anon Key，若要寫入請確保 RLS 已關閉。
const supabaseKey = 'sb_publishable_h5Q1q1X5ISgW7K73q09dEg_npZq69Lb';

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase 連線資訊不完整，請檢查環境變數。");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
