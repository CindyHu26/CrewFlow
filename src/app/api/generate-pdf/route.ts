import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import { format } from 'date-fns';

// HTML 模板
const HTML_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>服務紀錄表</title>
  <style>
    body {
      font-family: 'Microsoft JhengHei', sans-serif;
      font-size: 10pt;
      padding: 40px;
      max-width: 794px;
      margin: auto;
    }
    h1 {
      text-align: center;
      font-size: 16pt;
      margin-bottom: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    td {
      border: 1px solid #000;
      padding: 4px;
      vertical-align: top;
    }
    .section-title {
      font-weight: bold;
      background-color: #f0f0f0;
      padding: 6px;
      margin-top: 10px;
    }
    .signature-box {
      width: 150px;
      height: 75px;
      border: 1px solid #000;
      margin-top: 10px;
    }
    h3 {
      text-align: center;
      font-size: 12pt;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <h1>長青國際集團</h1>
  <h3>服務紀錄表（泰）（越）（印）（菲）</h3>
  <table>
    <tr>
      <td>客戶名稱</td><td>{{客戶名稱}}</td>
      <td>服務日期</td><td>{{服務時間}}</td>
    </tr>
    <tr>
      <td>工人姓名</td><td>{{工人姓名}}</td>
      <td>護照號碼</td><td></td>
    </tr>
    <tr>
      <td>工種</td><td>{{工種}}</td>
      <td>國籍</td><td>{{國籍}}</td>
    </tr>
    <tr>
      <td>來源</td><td colspan="3">親訪</td>
    </tr>
  </table>

  <div class="section-title">一、服務內容及反映事項</div>
  <p>รายการบริการและข้อเสนอ | Hạng mục phục vụ và sự việc phản ứng | JENIS SERVICE DAN HAL YANG DINYATAKAN | Service Contents and Response Matters</p>
  <p><strong>雇主 นายจ้าง Chủ sử dụng Majikan Employer：</strong><br>{{一、 服務內容及反映事項-1.雇主}}</p>
  <p><strong>工人 คนงาน Lao động TKI Worker：</strong><br>{{一、 服務內容及反映事項-2.移工}}</p>

  <div class="section-title">二、處理經過及結果</div>
  <p>ขั้นตอนการจัดการและผลสรุป | Thông qua xử lý và kết quả | PROSES DAN HASIL | Handle Process and Results</p>
  <p><strong>經過 ขั้นตอน Thông qua Proses Process：</strong><br>{{二、 1.處理經過}}</p>
  <p><strong>結果 ผลสรุป Kết quả Hasil Results：</strong><br>{{二、 2.處理結果}}</p>

  <div class="section-title">三、雇主/外勞資訊提供</div>
  <p>นายจ้างลูกจ้างให้ข่าวสาร | Cung cấp tin tức cho chủ sử dụng / lao động | INFORMASI YANG DIBERIKAN UNTUK MAJIKAN/PEKERJA | Supply Information to Employer/Foreign Worker</p>

  <p><strong>■ 緊急聯絡電話 เบอร์โทรยามฉุกเฉิน Số điện thoại liên lạc khẩn cấp của công ty  Pengaduan dan keadaan darurat Emergency Hotlines：</strong><br>04-7785333, 0913-087389, 0915-087588, 0985-680068, 0913-662729</p>

  <p><strong>■ 公司雙語人員姓名及聯絡電話：ชื่อล่ามและเบอร์โทรติดต่อ  Họ tên phiên dịch của công ty và số điện thoại liên lạc Nama dan Telp penterjemah  Company Translator's Name and Cell Phone Number
</strong><br>姓名 Họ tên Nama Name：{{同行人員}}<br>行動電話：</p>

  <table>
    <tr>
      <td>單位主管簽章 Unit Supervisor's signature</td>
      <td>服務人員簽章 Service Personnel's signature</td>
      <td>雇主簽章 Employer's signature</td>
      <td>工人簽章 คนงานเซ็นชื่อ Lao động ký tên TKI  Worker's signature</td>
    </tr>
    <tr>
      <td><div class="signature-box">{{單位主管簽名}}</div></td>
      <td><div class="signature-box">{{服務人員簽名}}</div></td>
      <td><div class="signature-box">{{雇主簽名}}</div></td>
      <td><div class="signature-box">{{工人簽名}}</div></td>
    </tr>
  </table>

  <p>如果您對此次服務人員、內容、態度、處理結果有任何不滿意之處，敬請告知本公司。申訴電話：04-7785333，我們將加以改進，並給您滿意的答覆。</p>
</body>
</html>`;

export async function POST(request: Request) {
  try {
    const service = await request.json();

    // 使用模板
    let template = HTML_TEMPLATE;

    // 準備替換的資料
    const data = {
      "客戶名稱": service.customer_name || '',
      "服務時間": format(new Date(service.timestamp), 'yyyy/MM/dd HH:mm'),
      "工人姓名": service.worker_name || '',
      "工種": (service.job_types || []).join('、') || '',
      "國籍": (service.nationalities || []).join('、') || '',
      "一、 服務內容及反映事項-1.雇主": service.service_feedback_employer || '',
      "一、 服務內容及反映事項-2.移工": service.service_feedback_worker || '',
      "二、 1.處理經過": service.handling_process || '',
      "二、 2.處理結果": service.handling_result || '',
      "同行人員": (service.partner_names || []).join('、') || '',
      "三、 雇主/移工資訊提供": ''
    };

    // 替換模板中的變數
    Object.entries(data).forEach(([key, value]) => {
      template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    // 處理簽名圖片
    if (service.employer_signature) {
      template = template.replace('{{雇主簽名}}', `<img src="${service.employer_signature}" style="width:100%;height:100%;object-fit:contain;">`);
    }
    if (service.worker_signature) {
      template = template.replace('{{工人簽名}}', `<img src="${service.worker_signature}" style="width:100%;height:100%;object-fit:contain;">`);
    }
    if (service.service_signature) {
      template = template.replace('{{服務人員簽名}}', `<img src="${service.service_signature}" style="width:100%;height:100%;object-fit:contain;">`);
      template = template.replace('{{單位主管簽名}}', `<img src="${service.service_signature}" style="width:100%;height:100%;object-fit:contain;">`);
    }

    // 清除未使用的變數標記
    template = template.replace(/{{[^}]+}}/g, '');

    // 使用 Puppeteer 生成 PDF
    const browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
      args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    
    // 設定頁面內容
    await page.setContent(template, {
      waitUntil: 'networkidle0'
    });

    // 設定 PDF 選項
    const pdfBuffer = await page.pdf({
      format: 'a4',
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      printBackground: true
    });

    await browser.close();

    // 回傳 PDF buffer
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="服務紀錄_${service.customer_name}_${format(new Date(service.timestamp), 'yyyyMMdd')}.pdf"`
      }
    });

  } catch (error) {
    console.error('產生 PDF 文件時發生錯誤:', error);
    return NextResponse.json({ error: '產生 PDF 時發生錯誤' }, { status: 500 });
  }
} 