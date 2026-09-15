import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Bell, User, Search, HelpCircle, Users, CheckCircle2, 
  TrendingUp, AlertCircle, RefreshCw, LayoutDashboard, 
  FileText, Settings, LogOut 
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

// ----------------------------------------------------------------------
// 1. مكون الترويسة العلوي (Header)
// ----------------------------------------------------------------------
function Header() {
  const LOGO_URL = "/__l5e/assets-v1/ea17457e-3d03-45de-bac7-28b294c17f81/althaat-logo.png";

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="شعار الذات" className="h-9 w-auto object-contain" />
            <div className="hidden sm:block border-r border-slate-200 pr-3 mr-1">
              <span className="text-sm font-bold text-slate-800 block leading-none">منصة الذات</span>
              <span className="text-[10px] text-slate-500 font-medium">لوحة التحكم والتوجيه</span>
            </div>
          </div>

          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="ابحث عن طالب، حالة، أو تقرير..." 
                className="w-full pl-4 pr-9 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <HelpCircle className="w-5 h-5" />
            </button>

            <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 left-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
            </button>

            <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>

            <div className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-semibold text-sm">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden lg:block text-right">
                <p className="text-xs font-bold text-slate-800">عبدالله المحمد</p>
                <p className="text-[10px] text-slate-500">موجه طلابي</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}

// ----------------------------------------------------------------------
// 2. الصفحة الرئيسية المدمجة (Dashboard Layout)
// ----------------------------------------------------------------------
export default function DashboardPage() {
  const [isRefetching, setIsRefetching] = useState(false);

  // بيانات افتراضية للمؤشرات للرسم البياني
  const chartData = [
    { month: 'يناير', cases: 12 },
    { month: 'فبراير', cases: 19 },
    { month: 'مارس', cases: 15 },
    { month: 'أبريل', cases: 22 },
    { month: 'مايو', cases: 28 },
    { month: 'يونيو', cases: 20 },
  ];

  const handleRefresh = () => {
    setIsRefetching(true);
    setTimeout(() => setIsRefetching(false), 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col" dir="rtl">
      
      {/* 1. الترويسة علوية ثابتة */}
      <Header />

      {/* 2. جسم الصفحة المقسم (Sidebar + Content) */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6">
        
        {/* الشريط الجانبي (Sidebar) */}
        <aside className="w-64 bg-white border border-slate-200 rounded-xl p-4 hidden lg:flex flex-col justify-between h-[calc(100vh-120px)] sticky top-20">
          <nav className="space-y-1">
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-bold bg-teal-50 text-teal-800 rounded-lg">
              <LayoutDashboard className="w-4 h-4" />
              لوحة التحكم
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
              <Users className="w-4 h-4" />
              إدارة الطلاب
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
              <FileText className="w-4 h-4" />
              التقارير والحالات
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
              <Settings className="w-4 h-4" />
              الإعدادات
            </a>
          </nav>

          <button className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors w-full mt-auto">
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </button>
        </aside>

        {/* محتوى الصفحة الرئيسي */}
        <main className="flex-1 space-y-6">
          
          {/* شريط الإجراءات والترويسة الداخلية */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">مؤشرات الأداء العامة</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">متابعة فورية للحالات والنشاط اليومي</p>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={isRefetching}
              className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
              تحديث المباشر
            </button>
          </div>

          {/* شبكة بطاقات الـ KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">إجمالي الطلاب</span>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600"><Users className="w-4 h-4" /></div>
              </div>
              <div className="mt-3"><span className="text-2xl font-bold text-slate-900">1,284</span></div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">معدل الحضور</span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600"><CheckCircle2 className="w-4 h-4" /></div>
              </div>
              <div className="mt-3"><span className="text-2xl font-bold text-slate-900">94.2%</span></div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">الحالات النشطة</span>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600"><TrendingUp className="w-4 h-4" /></div>
              </div>
              <div className="mt-3"><span className="text-2xl font-bold text-slate-900">42</span></div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">البلاغات المعلقة</span>
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600"><AlertCircle className="w-4 h-4" /></div>
              </div>
              <div className="mt-3"><span className="text-2xl font-bold text-slate-900">7</span></div>
            </div>
          </div>

          {/* الرسم البياني والجدول */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-4">تحليل الاتجاهات الشهرية</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff' }} />
                    <Area type="monotone" dataKey="cases" stroke="#0d9488" fillOpacity={1} fill="url(#colorCases)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-4">أحدث الحالات المسجلة</h3>
              <div className="space-y-3">
                {[
                  { name: 'أحمد علي', type: 'توجيه طلابي', status: 'مكتمل' },
                  { name: 'سارة خالد', type: 'استشارة أكاديمية', status: 'قيد المتابعة' },
                  { name: 'محمد العتيبي', type: 'متابعة سلوكية', status: 'معلق' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{item.name}</p>
                      <p className="text-slate-500">{item.type}</p>
                    </div>
                    <span className="font-medium text-teal-700 bg-teal-50 px-2 py-1 rounded">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </main>

      </div>
    </div>
  );
}