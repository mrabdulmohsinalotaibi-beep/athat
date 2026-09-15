<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>خطة برامج وخدمات التوجيه الطلابي - 1448 هـ</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --primary-color: #004d40;
            --secondary-color: #00796b;
            --accent-color: #00bfa5;
            --light-bg: #f4fdfc;
            --text-color: #333333;
            --border-color: #b2dfdb;
            --card-shadow: 0 4px 15px rgba(0, 77, 64, 0.08);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Cairo', sans-serif;
        }

        body {
            background-color: #f8f9fa;
            color: var(--text-color);
            line-height: 1.6;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        /* رأس الصفحة */
        header {
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            color: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            margin-bottom: 30px;
            box-shadow: var(--card-shadow);
        }

        header h1 {
            font-size: 24px;
            margin-bottom: 10px;
            font-weight: 700;
        }

        header p {
            font-size: 16px;
            opacity: 0.9;
        }

        /* لوحة التحكم والإضافة */
        .control-panel {
            background: white;
            padding: 25px;
            border-radius: 15px;
            margin-bottom: 30px;
            box-shadow: var(--card-shadow);
            border: 1px solid var(--border-color);
        }

        .control-panel h2 {
            font-size: 18px;
            color: var(--primary-color);
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .form-group label {
            font-size: 14px;
            font-weight: 600;
            color: var(--secondary-color);
        }

        .form-group input, .form-group textarea, .form-group select {
            padding: 10px 15px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            font-size: 14px;
            outline: none;
            transition: all 0.3s ease;
        }

        .form-group input:focus, .form-group textarea:focus {
            border-color: var(--accent-color);
            box-shadow: 0 0 5px rgba(0, 191, 165, 0.3);
        }

        .form-group textarea {
            resize: vertical;
            min-height: 80px;
        }

        .btn-add {
            grid-column: 1 / -1;
            background: var(--primary-color);
            color: white;
            border: none;
            padding: 12px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: background 0.3s ease;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 8px;
        }

        .btn-add:hover {
            background: var(--secondary-color);
        }

        /* شبكة عرض الأسابيع والبرامج */
        .weeks-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
        }

        .week-card {
            background: white;
            border-radius: 15px;
            padding: 20px;
            box-shadow: var(--card-shadow);
            border-top: 5px solid var(--accent-color);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            transition: transform 0.3s ease;
        }

        .week-card:hover {
            transform: translateY(-5px);
        }

        .week-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }

        .week-title {
            font-size: 16px;
            font-weight: 700;
            color: var(--primary-color);
        }

        .week-date {
            font-size: 12px;
            background: var(--light-bg);
            color: var(--secondary-color);
            padding: 4px 10px;
            border-radius: 20px;
            font-weight: 600;
        }

        .week-body {
            font-size: 14px;
            margin-bottom: 15px;
            color: #555;
        }

        .week-body p {
            margin-bottom: 8px;
        }

        .week-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid #f1f1f1;
            padding-top: 10px;
            font-size: 12px;
        }

        .status-badges {
            display: flex;
            gap: 8px;
        }

        .badge {
            padding: 3px 8px;
            border-radius: 6px;
            font-weight: 600;
        }

        .badge-exec { background: #e8f5e9; color: #2e7d32; }
        .badge-doc { background: #e3f2fd; color: #1565c0; }

        .btn-delete {
            background: #ffebee;
            color: #c62828;
            border: none;
            padding: 5px 10px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            transition: background 0.2s;
        }

        .btn-delete:hover {
            background: #ffcdd2;
        }

        @media (max-width: 768px) {
            .weeks-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>

    <div class="container">
        <header>
            <h1>الإدارة العامة للتعليم بمنطقة مكة المكرمة[cite: 2]</h1>
            <p>قسم التوجيه الطلابي | خطة برامج وخدمات التوجيه الطلابي (1448 هـ)[cite: 2]</p>
        </header>

        <!-- لوحة إضافة وتعديل البرامج -->
        <div class="control-panel">
            <h2><i class="fa-solid fa-calendar-plus"></i> إضافة برنامج أو أسبوع جديد للخطة</h2>
            <form id="programForm" class="form-grid">
                <div class="form-group">
                    <label for="weekTitle">عنوان الأسبوع / البرنامج</label>
                    <input type="text" id="weekTitle" placeholder="مثال: الأسبوع الأول - التهيئة الإرشادية" required>
                </div>
                <div class="form-group">
                    <label for="weekDate">الفترة التاريخية</label>
                    <input type="text" id="weekDate" placeholder="مثال: من 17 - 21 / 03 / 1448 هـ" required>
                </div>
                <div class="form-group" style="grid-column: 1 / -1;">
                    <label for="weekDetails">تفاصيل وبرامج الأسبوع</label>
                    <textarea id="weekDetails" placeholder="أدخل الأهداف، الإجراءات، والأنشطة الخاصة بهذا الأسبوع..." required></textarea>
                </div>
                <button type="submit" class="btn-add">
                    <i class="fa-solid fa-plus-circle"></i> إضافة البرنامج للخطة
                </button>
            </form>
        </div>

        <!-- عرض الأسابيع والبرامج -->
        <div class="weeks-grid" id="weeksContainer">
            <!-- البطاقات تضاف ديناميكياً عبر JavaScript -->
        </div>
    </div>

    <script>
        // البيانات الافتراضية المستندة للخطة الأصلية
        let programs = [
            {
                title: "الأسبوع الأول: برنامج التهيئة الإرشادية والأسبوع التمهيدي",
                date: "17 - 21 / 03 / 1448 هـ",
                details: "التهيئة النفسية والتربوية والاجتماعية لتحقيق تكيف الطلبة، تعريف الطلبة بلوائح وأنظمة المدرسة، وتفعيل مجالس أولياء الأمور.",
                executed: "نعم",
                documented: "نعم"
            },
            {
                title: "الأسبوع الثاني: تعزيز السلوك الإيجابي والانضباط",
                date: "24 - 28 / 03 / 1448 هـ",
                details: "التعريف بالبرنامج والإعلان عن القيم المستهدفة، تفعيل جائزة المدرسة للتميز السلوكي، ومتابعة المشكلات السلوكية الأكثر شيوعاً.",
                executed: "نعم",
                documented: "نعم"
            },
            {
                title: "الأسبوع الرابع: اليوم الوطني والبرنامج المكثف لرفق",
                date: "09 - 14 / 04 / 1448 هـ",
                details: "تفعيل اليوم الوطني للمملكة العربية السعودية، وتفعيل الأسبوع المكثف لبرنامج (رفق) للحد من العنف المدرسي.",
                executed: "نعم",
                documented: "نعم"
            }
        ];

        function renderPrograms() {
            const container = document.getElementById('weeksContainer');
            container.innerHTML = '';

            programs.forEach((prog, index) => {
                const card = document.createElement('div');
                card.className = 'week-card';
                card.innerHTML = `
                    <div>
                        <div class="week-header">
                            <span class="week-title">${prog.title}</span>
                            <span class="week-date">${prog.date}</span>
                        </div>
                        <div class="week-body">
                            <p>${prog.details}</p>
                        </div>
                    </div>
                    <div class="week-footer">
                        <div class="status-badges">
                            <span class="badge badge-exec">نفذ: ${prog.executed}</span>
                            <span class="badge badge-doc">وثق: ${prog.documented}</span>
                        </div>
                        <button class="btn-delete" onclick="deleteProgram(${index})">
                            <i class="fa-solid fa-trash"></i> حذف
                        </button>
                    </div>
                `;
                container.appendChild(card);
            });
        }

        document.getElementById('programForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const newProg = {
                title: document.getElementById('weekTitle').value,
                date: document.getElementById('weekDate').value,
                details: document.getElementById('weekDetails').value,
                executed: "نعم",
                documented: "نعم"
            };

            programs.push(newProg);
            renderPrograms();
            this.reset();
        });

        function deleteProgram(index) {
            programs.splice(index, 1);
            renderPrograms();
        }

        // التهيئة الأولية للعرض
        renderPrograms();
    </script>
</body>
</html>