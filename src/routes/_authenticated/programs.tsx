<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>خطة التوجيه الطلابي - 1448هـ</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; color: #333; }
        .container { max-width: 1000px; margin: auto; background: #fff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        h1 { text-align: center; color: #0077b6; margin-bottom: 5px; }
        p.subtitle { text-align: center; color: #666; margin-top: 0; margin-bottom: 30px; }
        .form-section { background: #eef2f3; padding: 20px; border-radius: 8px; margin-bottom: 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .form-section input, .form-section select { padding: 10px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; width: 100%; box-sizing: border-box; }
        .form-section button { grid-column: span 2; background: #0077b6; color: #fff; border: none; padding: 12px; border-radius: 6px; font-size: 16px; cursor: pointer; font-weight: bold; transition: background 0.3s; }
        .form-section button:hover { background: #005f87; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; background: #fff; }
        th, td { border: 1px solid #e0e0e0; padding: 12px; text-align: center; font-size: 14px; }
        th { background-color: #0077b6; color: white; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .actions-btn { background: #e63946; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; }
        .actions-btn:hover { background: #d62828; }
    </style>
</head>
<body>

<div class="container">
    <h1>نظام إدارة خطة التوجيه الطلابي</h1>
    <p class="subtitle">متوسطة علاء بن الحضرمي - الفصل الدراسي الأول 1448هـ</p>

    <!-- نموذج إضافة برنامج جديد -->
    <div class="form-section">
        <input type="text" id="weekName" placeholder="اسم الأسبوع أو الفترة (مثال: الأسبوع الأول)">
        <input type="text" id="progName" placeholder="اسم البرنامج الأساسي">
        <input type="text" id="progDetails" placeholder="تفاصيل وأنشطة البرنامج">
        <select id="isDone">
            <option value="نعم">تم التنفيذ (نعم)</option>
            <option value="لا">لم يتم التنفيذ (لا)</option>
        </select>
        <button onclick="addProgram()">إضافة البرنامج للخطة</button>
    </div>

    <!-- جدول عرض البرامج -->
    <table id="planTable">
        <thead>
            <tr>
                <th>الفترة / الأسبوع</th>
                <th>البرنامج الأساسي</th>
                <th>التفاصيل والإجراءات</th>
                <th>الحالة</th>
                <th>إدارة</th>
            </tr>
        </thead>
        <tbody>
            <!-- البيانات الافتراضية الأولية -->
            <tr>
                <td>الأسبوع الأول</td>
                <td>التهيئة الإرشادية والأسبوع التمهيدي</td>
                <td>تهيئة نفسية وتربوية وتحقيق تكيف الطلاب[cite: 2]</td>
                <td>نعم</td>
                <td><button class="actions-btn" onclick="deleteRow(this)">حذف</button></td>
            </tr>
            <tr>
                <td>الأسبوع الثاني</td>
                <td>تعزيز السلوك الإيجابي</td>
                <td>تفعيل جائزة المدرسة للتميز السلوكي[cite: 2]</td>
                <td>نعم</td>
                <td><button class="actions-btn" onclick="deleteRow(this)">حذف</button></td>
            </tr>
        </tbody>
    </table>
</div>

<script>
    function addProgram() {
        const week = document.getElementById('weekName').value;
        const name = document.getElementById('progName').value;
        const details = document.getElementById('progDetails').value;
        const done = document.getElementById('isDone').value;

        if(!week || !name) {
            alert('يرجى تعبئة حقل الأسبوع واسم البرنامج على الأقل.');
            return;
        }

        const table = document.getElementById('planTable').getElementsByTagName('tbody')[0];
        const newRow = table.insertRow();

        newRow.innerHTML = `
            <td>${week}</td>
            <td>${name}</td>
            <td>${details}</td>
            <td>${done}</td>
            <td><button class="actions-btn" onclick="deleteRow(this)">حذف</button></td>
        `;

        // تفريغ الحقول بعد الإضافة
        document.getElementById('weekName').value = '';
        document.getElementById('progName').value = '';
        document.getElementById('progDetails').value = '';
    }

    function deleteRow(btn) {
        const row = btn.parentNode.parentNode;
        row.parentNode.removeChild(row);
    }
</script>

</body>
</html>