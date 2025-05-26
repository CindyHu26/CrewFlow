'use client';

import React, { useRef } from 'react';
import html2pdf from 'html2pdf.js';
import { format } from 'date-fns';
import { Service, SubItem, Expense, Report } from '@/types/service';

// 替換變數顯示組件
const HighlightedValue = ({ value }: { value: string | undefined }) => (
  <span className="bg-yellow-100 px-2 py-1 rounded">
    {value || ''}
  </span>
);

interface Props {
  service: Service & {
    sub_items?: SubItem[];
    expenses?: Expense[];
    reports?: Report[];
  };
}

export default function GeneratePDF({ service }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const handleExport = () => {
    if (!ref.current) return;

    const fileName = `服務紀錄_${service.customer_names.join('_')}_${format(service.timestamp.toDate(), 'yyyyMMdd')}.pdf`;

    html2pdf()
      .set({
        margin: 0.2,  // 統一設定所有邊界為 0.2 英吋
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2
        },
        jsPDF: { 
          unit: 'in', 
          format: 'a4', 
          orientation: 'portrait'
        }
      })
      .from(ref.current)
      .save();
  };

  // 共用的表格樣式
  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse' as const,
    border: '2px solid #000',
    marginBottom: '0.5rem'
  };

  // 共用的儲存格樣式
  const cellStyle = {
    padding: '8px',
    border: '1px solid #000',
    fontSize: '9pt'
  };

  // 區塊容器樣式
  const sectionStyle = {
    marginBottom: '0.8rem',
    border: '2px solid #000',
    padding: '0.8rem'
  };

  // 區塊標題樣式
  const sectionTitleStyle = {
    fontWeight: 'bold',
    backgroundColor: '#f3f4f6',
    padding: '8px',
    marginBottom: '8px',
    borderBottom: '2px solid #000',
    fontSize: '10pt'
  };

  // 簽名欄樣式
  const signatureCellStyle = {
    ...cellStyle,
    height: '120px',
    textAlign: 'center' as const,
    verticalAlign: 'top' as const,
    fontSize: '8pt'
  };

  // 勾選框樣式
  const checkboxStyle = {
    marginRight: '6px',
    marginBottom: '6px',
    fontSize: '8pt'
  };

  return (
    <div>
      {/* PDF 可視內容 */}
      <div ref={ref} id="pdf-content" className="bg-white p-4 text-black" style={{ fontSize: '9pt' }}>
        {/* 浮水印 */}
        <div style={{
          position: 'absolute',
          top: '0.5rem',
          left: '0.5rem',
          width: '60px',
          height: '60px',
          opacity: 0.8,
          zIndex: 100
        }}>
          <img 
            src="/evergreen_zhtw.png" 
            alt="浮水印"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        </div>

        <h1 style={{ textAlign: 'center', fontSize: '18pt', marginBottom: '0.2rem' }}>長青國際集團</h1>
        <h3 style={{ textAlign: 'center', fontSize: '14pt', marginBottom: '0.5rem' }}>服務紀錄表 泰 越 印 菲</h3>

        <table style={{ ...tableStyle, marginBottom: '0.3rem' }}>
          <tbody>
            <tr>
              <td style={{ ...cellStyle, padding: '4px 8px' }}>客戶名稱</td>
              <td style={{ ...cellStyle, padding: '4px 8px' }}>
                <HighlightedValue value={service.customer_names.join('、')} />
              </td>
              <td style={{ ...cellStyle, padding: '4px 8px' }}>服務日期</td>
              <td style={{ ...cellStyle, padding: '4px 8px' }}>
                <HighlightedValue value={format(service.timestamp.toDate(), 'yyyy/MM/dd HH:mm')} />
              </td>
            </tr>
            <tr>
              <td style={{ ...cellStyle, padding: '4px 8px' }}>工人姓名</td>
              <td style={{ ...cellStyle, padding: '4px 8px' }}><HighlightedValue value={service.worker_name} /></td>
              <td style={{ ...cellStyle, padding: '4px 8px' }}>護照號碼</td>
              <td style={{ ...cellStyle, padding: '4px 8px' }}></td>
            </tr>
            <tr>
              <td style={{ ...cellStyle, padding: '4px 8px' }}>工種</td>
              <td style={{ ...cellStyle, padding: '4px 8px' }}><HighlightedValue value={(service.job_types || []).join('、')} /></td>
              <td style={{ ...cellStyle, padding: '4px 8px' }}>國籍</td>
              <td style={{ ...cellStyle, padding: '4px 8px' }}><HighlightedValue value={(service.nationalities || []).join('、')} /></td>
            </tr>
            <tr>
              <td style={{ ...cellStyle, padding: '4px 8px' }}>來源</td>
              <td style={{ ...cellStyle, padding: '4px 8px' }} colSpan={3}>親訪</td>
            </tr>
          </tbody>
        </table>

        

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            一、服務內容及反映事項
          </div>
          <p style={{ fontSize: '8pt', marginBottom: '8px' }}>
            รายการบริการและข้อเสนอ | Hạng mục phục vụ và sự việc phản ứng | JENIS SERVICE DAN HAL YANG DINYATAKAN | Service Contents and Response Matters
          </p>
          <div style={{ marginBottom: '1rem', padding: '8px', border: '1px solid #000', minHeight: '100px' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ display: 'block', marginBottom: '16px' }}>雇主 นายจ้าง Chủ sử dụng Majikan Employer：</strong>
              <HighlightedValue value={service.service_feedback_employer} />
            </p>
          </div>
          <div style={{ padding: '8px', border: '1px solid #000', minHeight: '100px' }}>
            <p>
              <strong style={{ display: 'block', marginBottom: '16px' }}>工人 คนงาน Lao động TKI Worker：</strong>
              <HighlightedValue value={service.service_feedback_worker} />
            </p>
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            二、處理經過及結果
          </div>
          <p style={{ fontSize: '8pt', marginBottom: '8px' }}>
            ขั้นตอนการจัดการและผลสรุป | Thông qua xử lý và kết quả | PROSES DAN HASIL | Handle Process and Results
          </p>
          <div style={{ marginBottom: '1rem', padding: '8px', border: '1px solid #000', minHeight: '100px' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ display: 'block', marginBottom: '16px' }}>經過 ขั้นตอน Thông qua Proses Process：</strong>
              <HighlightedValue value={service.handling_process} />
            </p>
          </div>
          <div style={{ padding: '8px', border: '1px solid #000', minHeight: '100px' }}>
            <p>
              <strong style={{ display: 'block', marginBottom: '16px' }}>結果 ผลสรุป Kết quả Hasil Results：</strong>
              <HighlightedValue value={service.handling_result} /><br /><br />
              {service.sub_items && service.sub_items.length > 0 && (
                <>
                  <HighlightedValue value={service.sub_items.map((item, index) => (
                    `${item.category} ${item.item_name} ${item.quantity}個 ${item.note}`
                  )).join('、')} /><br /><br />
                </>
              )}
              {service.expenses && service.expenses.length > 0 && (
                <>
                  <HighlightedValue value={service.expenses.map((expense, index) => (
                    `${expense.category} ${expense.amount}元 ${expense.description}`
                  )).join('、')} />
                </>
              )}
            </p>
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            三、雇主/外勞資訊提供
          </div>
          <p style={{ fontSize: '8pt', marginBottom: '4px' }}>
            นายจ้างลูกจ้างให้ข่าวสาร | Cung cấp tin tức cho chủ sử dụng / lao động | INFORMASI YANG DIBERIKAN UNTUK MAJIKAN/PEKERJA | Supply Information to Employer/Foreign Worker
          </p>
          <p style={{ marginBottom: '4px', fontSize: '8pt' }}>
            <strong>■ 緊急聯絡電話 เบอร์โทรยามฉุกเฉิน Số điện thoại liên lạc khẩn cấp của công ty Pengaduan dan keadaan darurat Emergency Hotlines：</strong><br />
            04-7785333, 0913-087389, 0915-087588, 0985-680068, 0913-662729
          </p>
          <p style={{ marginBottom: '4px', fontSize: '8pt' }}>
            <strong>■ 公司雙語人員姓名及聯絡電話：ชื่อล่ามและเบอร์โทรติดต่อ Họ tên phiên dịch của công ty và số điện thoại liên lạc Nama dan Telp penterjemah Company Translator's Name and Cell Phone Number</strong><br />
            姓名 Họ tên Nama Name：{service.partner_names?.join('、')}<br />
            行動電話：
          </p>
          <div style={{ marginBottom: '4px' }}>
            <label style={{ ...checkboxStyle, fontSize: '8pt' }}>
              □ 送國外雜誌บริการนิตยาสาร Tặng tạp chí Mengantar Koran/Majalah deliver foreign magazine 本เล่ม quyển Buku booklet
            </label>
          </div>
          <div style={{ marginBottom: '4px' }}>
            <label style={{ ...checkboxStyle, fontSize: '8pt' }}>
              □ 勞動部外語廣播節目資訊 ฟังรายการวิทยุข่าวภาษาต่างชาติจากกระทรวงแรงงาน Đài phát thanh tin tức tiếng Việt của bộ lao động Informasi siaran radio bahasa asing dari majelis tenaga kerja CLA's Information of foreign language broadcasting program
            </label>
          </div>
          <div style={{ marginBottom: '4px' }}>
            <label style={{ ...checkboxStyle, fontSize: '8pt' }}>
              □ 法令宣導/簽署 แจ้งข้อกฎหมายให้ทราบ2เซ็นชื่อ Tuyên truyền pháp lệnh / ký nhận Pengarahan undang-undang/Penanda-tanganan Laws & Decrees declare / signature
            </label>
          </div>
          <div style={{ marginBottom: '4px' }}>
            <label style={{ ...checkboxStyle, fontSize: '8pt' }}>
              □ 其他：อื่นๆ Những điều khác Lain-lain Others {service.shared_info}
            </label>
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            四、主管批示意見及追蹤處理事項
          </div>
          <p style={{ marginBottom: '12px' }}>
            Supervisor's comments & follow-up on handle matters
          </p>
        </div>

        <table style={tableStyle}>
          <tbody>
            <tr>
              <td style={signatureCellStyle}>
                <div style={{ marginBottom: '8px' }}>
                  單位主管簽章<br />Unit Supervisor's signature
                </div>
              </td>
              <td style={signatureCellStyle}>
                <div style={{ marginBottom: '8px' }}>
                  服務人員簽章<br />Service Personnel's signature
                </div>
                {service.service_signature && (
                  <img src={service.service_signature} style={{ width: '90%', height: '80%', objectFit: 'contain' }} />
                )}
              </td>
              <td style={signatureCellStyle}>
                <div style={{ marginBottom: '8px' }}>
                  雇主簽章<br />Employer's signature
                </div>
                {service.employer_signature && (
                  <img src={service.employer_signature} style={{ width: '90%', height: '80%', objectFit: 'contain' }} />
                )}
              </td>
              <td style={signatureCellStyle}>
                <div style={{ marginBottom: '8px' }}>
                  工人簽章<br />คนงานเซ็นชื่อ<br />Lao động ký tên<br />TKI Worker's signature
                </div>
                {service.worker_signature && (
                  <img src={service.worker_signature} style={{ width: '90%', height: '80%', objectFit: 'contain' }} />
                )}
              </td>
            </tr>
          </tbody>
        </table>

        <p style={{ marginTop: '0.8rem', fontSize: '8pt' }}>
          如果您對此次服務人員、內容、態度、處理結果有任何不滿意之處，敬請告知本公司。申訴電話：04-7785333，我們將加以改進，並給您滿意的答覆。
        </p>
      </div>

      {/* 按鈕 */}
      <button
        onClick={handleExport}
        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        下載 PDF
      </button>
    </div>
  );
} 