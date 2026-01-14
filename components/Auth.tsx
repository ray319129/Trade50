
import React, { useState } from 'react';

interface AuthProps {
  onLogin: (username: string) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return setError('請輸入帳號密碼');

    const authData = JSON.parse(localStorage.getItem('tw50_auth') || '{"users":{}}');
    
    if (isRegister) {
      if (authData.users[username]) return setError('帳號已存在');
      authData.users[username] = password;
      localStorage.setItem('tw50_auth', JSON.stringify(authData));
      alert('註冊成功！請登入');
      setIsRegister(false);
    } else {
      if (authData.users[username] !== password) return setError('帳號或密碼錯誤');
      onLogin(username);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 overflow-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-blue-500 rounded-full blur-[120px] opacity-20 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-red-500 rounded-full blur-[120px] opacity-10 animate-pulse"></div>
      
      <div className="bg-white/10 backdrop-blur-xl border border-white/10 w-full max-w-md p-10 rounded-[2.5rem] shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black mb-4 shadow-xl shadow-blue-500/20">台</div>
          <h1 className="text-white text-2xl font-black tracking-tight">TW50 模擬交易</h1>
          <p className="text-slate-400 text-sm mt-1">進入專業級台灣 50 指數交易世界</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <input 
              type="text" 
              placeholder="使用者名稱" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:ring-2 ring-blue-500 outline-none transition-all placeholder:text-slate-500"
            />
          </div>
          <div>
            <input 
              type="password" 
              placeholder="密碼" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:ring-2 ring-blue-500 outline-none transition-all placeholder:text-slate-500"
            />
          </div>
          {error && <p className="text-red-400 text-xs font-bold text-center">{error}</p>}
          
          <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-95">
            {isRegister ? '立即註冊' : '登入系統'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="text-slate-400 text-sm font-bold hover:text-white transition-colors"
          >
            {isRegister ? '已有帳號？返回登入' : '還沒有帳號？點此註冊'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
