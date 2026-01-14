import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserState } from '../types';

// Supabase 配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;

// 初始化 Supabase 客户端
export const getSupabaseClient = (): SupabaseClient | null => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase 未配置，將使用本地存儲模式');
    return null;
  }
  
  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  
  return supabase;
};

// 檢查是否啟用雲端同步
export const isCloudSyncEnabled = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey);
};

// 用戶認證相關
export const authService = {
  // 註冊用戶
  async register(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    
    // 驗證電子郵件格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: '請輸入有效的電子郵件地址（如：example@gmail.com 或 example@edu.tw）' };
    }
    
    // 從電子郵件地址提取用戶名（@ 前面的部分）
    const username = email.split('@')[0];
    
    if (!client) {
      // 降級到本地存儲
      const authData = JSON.parse(localStorage.getItem('tw50_auth') || '{"users":{}}');
      if (authData.users[email]) {
        return { success: false, error: '此電子郵件地址已註冊' };
      }
      authData.users[email] = password;
      localStorage.setItem('tw50_auth', JSON.stringify(authData));
      return { success: true };
    }

    try {
      // 使用真實的電子郵件地址註冊
      const { data, error } = await client.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            username: username
          }
        }
      });

      if (error) {
        // 如果用戶已存在
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          return { success: false, error: '此電子郵件地址已註冊' };
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || '註冊失敗' };
    }
  },

  // 登入用戶
  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    
    // 驗證電子郵件格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: '請輸入有效的電子郵件地址' };
    }
    
    if (!client) {
      // 降級到本地存儲
      const authData = JSON.parse(localStorage.getItem('tw50_auth') || '{"users":{}}');
      if (authData.users[email] !== password) {
        return { success: false, error: '電子郵件地址或密碼錯誤' };
      }
      return { success: true };
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        return { success: false, error: '電子郵件地址或密碼錯誤' };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || '登入失敗' };
    }
  },

  // 登出
  async logout(): Promise<void> {
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }
    localStorage.removeItem('tw50_current_user');
    localStorage.removeItem('tw50_current_user_email');
  },

  // 獲取當前用戶
  async getCurrentUser(): Promise<string | null> {
    const client = getSupabaseClient();
    if (!client) {
      return localStorage.getItem('tw50_current_user');
    }

    try {
      const { data: { user } } = await client.auth.getUser();
      if (user) {
        // 優先使用 user_metadata 中的 username，否則使用 email 的前綴
        if (user.user_metadata?.username) {
          return user.user_metadata.username;
        }
        // 如果沒有 username，從 email 提取
        if (user.email) {
          return user.email.split('@')[0];
        }
      }
      return null;
    } catch {
      return localStorage.getItem('tw50_current_user');
    }
  },
  
  // 獲取當前用戶的電子郵件地址
  async getCurrentUserEmail(): Promise<string | null> {
    const client = getSupabaseClient();
    if (!client) {
      return localStorage.getItem('tw50_current_user_email');
    }

    try {
      const { data: { user } } = await client.auth.getUser();
      if (user && user.email) {
        return user.email;
      }
      return localStorage.getItem('tw50_current_user_email');
    } catch {
      return localStorage.getItem('tw50_current_user_email');
    }
  }
};

// 用戶數據同步相關
export const userDataService = {
  // 從雲端載入用戶數據
  async loadUserData(username: string): Promise<UserState | null> {
    const client = getSupabaseClient();
    
    // 如果未配置 Supabase，使用本地存儲
    if (!client) {
      const saved = localStorage.getItem(`tw50_user_${username}`);
      return saved ? JSON.parse(saved) : null;
    }

    try {
      // 獲取當前用戶的 UUID
      const { data: { user } } = await client.auth.getUser();
      if (!user) {
        const saved = localStorage.getItem(`tw50_user_${username}`);
        return saved ? JSON.parse(saved) : null;
      }

      const { data, error } = await client
        .from('user_data')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // 如果記錄不存在，返回 null
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('載入用戶數據失敗:', error);
        // 降級到本地存儲
        const saved = localStorage.getItem(`tw50_user_${username}`);
        return saved ? JSON.parse(saved) : null;
      }

      return data?.data as UserState | null;
    } catch (err) {
      console.error('載入用戶數據錯誤:', err);
      // 降級到本地存儲
      const saved = localStorage.getItem(`tw50_user_${username}`);
      return saved ? JSON.parse(saved) : null;
    }
  },

  // 保存用戶數據到雲端
  async saveUserData(userData: UserState): Promise<boolean> {
    const client = getSupabaseClient();
    
    // 如果未配置 Supabase，使用本地存儲
    if (!client) {
      localStorage.setItem(`tw50_user_${userData.username}`, JSON.stringify(userData));
      return true;
    }

    try {
      // 獲取當前用戶的 UUID
      const { data: { user } } = await client.auth.getUser();
      if (!user) {
        console.error('無法獲取用戶資訊');
        localStorage.setItem(`tw50_user_${userData.username}`, JSON.stringify(userData));
        return false;
      }

      const { error } = await client
        .from('user_data')
        .upsert({
          user_id: user.id,
          username: userData.username,
          data: userData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('保存用戶數據失敗:', error);
        // 降級到本地存儲
        localStorage.setItem(`tw50_user_${userData.username}`, JSON.stringify(userData));
        return false;
      }

      // 同時保存到本地作為備份
      localStorage.setItem(`tw50_user_${userData.username}`, JSON.stringify(userData));
      return true;
    } catch (err) {
      console.error('保存用戶數據錯誤:', err);
      // 降級到本地存儲
      localStorage.setItem(`tw50_user_${userData.username}`, JSON.stringify(userData));
      return false;
    }
  },

  // 同步用戶數據（從雲端拉取最新數據）
  async syncUserData(username: string): Promise<UserState | null> {
    const client = getSupabaseClient();
    if (!client) {
      return null;
    }

    try {
      // 獲取當前用戶的 UUID
      const { data: { user } } = await client.auth.getUser();
      if (!user) {
        return null;
      }

      const { data, error } = await client
        .from('user_data')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        return null;
      }

      const userData = data.data as UserState;
      // 更新本地存儲
      localStorage.setItem(`tw50_user_${username}`, JSON.stringify(userData));
      return userData;
    } catch (err) {
      console.error('同步用戶數據錯誤:', err);
      return null;
    }
  }
};
