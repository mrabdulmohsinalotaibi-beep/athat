import React, { useState } from 'react';
import { Printer, FileText, CheckSquare, Square } from 'lucide-react';

// نموذج لبيانات الرسائل الواردة (يمكن ربطها بـ Supabase لاحقاً)
interface Message {
  id: string;
  senderName: string;
  date: string;
  content: string;
  category: string;
}

const initialMessages: Message[] = [
  { id: '1', senderName: 'محمد أحمد', date: '2026-09-18', content: 'رسالة بخصوص طلب استشارة طلابية وتوجيه.', category: 'استشارة' },
  { id: '2', senderName: 'خالد عبدالله', date: '2026-09-17', content: 'ملاحظة حول الأنشطة الصفية والبرامج المقدمة.', category: 'ملاحظة' },
];

export default function MessagesDashboard() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [printingMessage, setPrintingMessage] = useState<Message | null>(null);

  // تحديد/إلغاء تحديد رسالة للطباعة الجماعية
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // طباعة رسالة فردية بكليشة رسمية
  const handlePrintSingle = (msg: Message) => {
    setPrintingMessage(msg);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen rounded-xl shadow-inner">
      {/* قسم عرض النموذج (Microsoft Forms Embed) */}
      <div className="mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold mb-3 text-gray-800">نموذج استقبال الآراء والرسائل</h2>
        <div className="w-full h-[400px] overflow-hidden rounded-lg border">
          <iframe 
            src="https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=fzu0XJrLzUiQCBUY6oBA4J4AHLLZqklFneKnUkWb919UN01LNllKWFo0VVZJV1VXOTlIOTlNMVpZUC4u" 
            width="100%" 
            height="100%" 
            style={{ border: 'none' }}
            title="نموذج الاستقبال"
          ></iframe>
        </div>
      </div>

      {/* لوحة التحكم المصغرة للرسائل */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">لوحة تحكم الرسائل والآراء الواردة</h3>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Printer size={18} /> طباعة المحدد (تصدير رسمي)
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b bg-gray-100 text-gray-700 text-sm">
                <th className="p-3">اختر</th>
                <th className="p-3">المرسل</th>
                <th className="p-3">التاريخ</th>
                <th className="p-3">التصنيف</th>
                <th className="p-3">محتوى الرسالة</th>
                <th className="p-3">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => (
                <tr key={msg.id} className="border-b hover:bg-gray-50 text-sm">
                  <td className="p-3 cursor-pointer" onClick={() => toggleSelect(msg.id)}>
                    {selectedIds.includes(msg.id) ? (
                      <CheckSquare className="text-blue-600" size={20} />
                    ) : (
                      <Square className="text-gray-400" size={20} />
                    )}
                  </td>
                  <td className="p-3 font-medium text-gray-900">{msg.senderName}</td>
                  <td className="p-3 text-gray-500">{msg.date}</td>
                  <td className="p-3">
                    <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-xs">
                      {msg.category}
                    </span>
                  </td>
                  <td className="p-3 text-gray-700 max-w-xs truncate">{msg.content}</td>
                  <td className="p-3">
                    <button 
                      onClick={() => handlePrintSingle(msg)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-semibold bg-blue-50 px-3 py-1.5 rounded-md"
                    >
                      <FileText size={14} /> طباعة رسمية
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* قالب الطباعة المخفي (يظهر فقط عند الطباعة عبر CSS) */}
      <div className="hidden print:block print:p-8 bg-white text-black font-sans">
        <div className="text-center border-b pb-4 mb-6">
          <h1 className="text-xl font-bold">المملكة العربية السعودية</h1>
          <h2 className="text-lg">وزارة التعليم</h2>
          <p className="text-sm text-gray-600">إدارة التعليم - نموذج تقرير الرسائل والآراء الرسمية</p>
        </div>

        <div className="mb-6">
          <p><strong>تاريخ الطباعة:</strong> {new Date().toLocaleDateString('ar-SA')}</p>
        </div>

        <div className="space-y-6">
          {messages
            .filter(m => selectedIds.includes(m.id) || (printingMessage && printingMessage.id === m.id))
            .map((msg, index) => (
              <div key={msg.id} className="border p-4 rounded-lg mb-4 page-break">
                <div className="flex justify-between font-bold border-b pb-2 mb-2">
                  <span>المرسل: {msg.senderName}</span>
                  <span>التاريخ: {msg.date}</span>
                </div>
                <p className="text-gray-800 leading-relaxed mt-2">{msg.content}</p>
              </div>
            ))}
        </div>

        <div className="mt-16 flex justify-between pt-8 border-t text-sm">
          <div>
            <p>المختص / الموجه الطلابي:</p>
            <p className="mt-8">التوقيع: ........................</p>
          </div>
          <div>
            <p>اعتماد إدارة المدرسة:</p>
            <p className="mt-8">الختم: ........................</p>
          </div>
        </div>
      </div>
    </div>
  );
}