'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { SignatureField } from '@/components/SignaturePad';
import { ServiceFormData, SubItem, Expense, Report } from '@/types/service';
import { useRouter, useParams } from 'next/navigation';
import { serviceDB, subItemDB, expenseDB, userDB, reportDB, updateSubTables } from '@/lib/serviceDB';
import { customerDB } from '@/lib/customerDB';
import { getCurrentUser } from '@/lib/auth';
import { Timestamp } from 'firebase/firestore';
import { runTransaction, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Combobox } from '@headlessui/react';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';

// 定義常數
const NATIONALITIES = ['印尼', '越南', '泰國', '菲律賓'] as const;
const JOB_TYPES = ['廠工', '看護工', '幫傭'] as const;
const COLLECTION_NAME = 'services';

function MultiSelectCombobox({ 
  options, 
  selected,
  onChange,
  placeholder,
  displayValue,
  showCategory = false
}: { 
  options: { id: string; name: string; category?: string; departments?: string[] }[];
  selected: string[];
  onChange: (value: string) => void;
  placeholder: string;
  displayValue?: (option: { id: string; name: string; category?: string; departments?: string[] }) => string;
  showCategory?: boolean;
}) {
  const [query, setQuery] = useState('');

  const filteredOptions = query === ''
    ? options
    : options.filter((option) => {
        return option.name.toLowerCase().includes(query.toLowerCase()) ||
               option.id.toLowerCase().includes(query.toLowerCase()) ||
               (option.category && option.category.toLowerCase().includes(query.toLowerCase())) ||
               (option.departments && option.departments.join(' ').toLowerCase().includes(query.toLowerCase()));
      });

  return (
    <div className="relative mt-1">
      <div className="flex gap-2 flex-wrap mb-2">
        {selected.map(id => {
          const option = options.find(opt => opt.id === id);
          if (!option) return null;
          return (
            <span
              key={id}
              className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-700"
            >
              <span>{option.name}</span>
              {showCategory && option.category && (
                <span className="ml-1 text-blue-500">（{option.category}）</span>
              )}
              {option.departments && (
                <span className="ml-1 text-blue-500">（{option.departments.join('/')}）</span>
              )}
              <button
                type="button"
                onClick={() => onChange(id)}
                className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full hover:bg-blue-200"
              >
                <span className="sr-only">移除</span>
                ×
              </button>
            </span>
          );
        })}
      </div>
      <Combobox as="div" value="" onChange={onChange}>
        <div className="relative">
          <Combobox.Input
            className="w-full rounded-md border-0 bg-white py-1.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </Combobox.Button>
        </div>

        <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {filteredOptions.length === 0 && query !== '' ? (
            <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
              找不到符合的選項
            </div>
          ) : (
            filteredOptions.map((option) => (
              <Combobox.Option
                key={option.id}
                value={option.id}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-3 pr-9 ${
                    active ? 'bg-indigo-600 text-white' : 'text-gray-900'
                  }`
                }
              >
                {({ active }) => (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selected.includes(option.id)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                      onChange={() => {}}
                    />
                    <span className="ml-3 truncate">
                      {displayValue ? displayValue(option) : option.name}
                    </span>
                    {showCategory && option.category && (
                      <span className={`ml-2 truncate text-sm ${
                        active ? 'text-indigo-200' : 'text-gray-500'
                      }`}>
                        （{option.category}）
                      </span>
                    )}
                    {option.departments && (
                      <span className={`ml-2 truncate text-sm ${
                        active ? 'text-indigo-200' : 'text-gray-500'
                      }`}>
                        （{option.departments.join('/')}）
                      </span>
                    )}
                  </div>
                )}
              </Combobox.Option>
            ))
          )}
        </Combobox.Options>
      </Combobox>
    </div>
  );
}

export default function EditServicePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string; departments: string[] }>>([]);
  const [customerList, setCustomerList] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPartners, setSelectedPartners] = useState<string[]>([]);

  // 表單資料
  const [formData, setFormData] = useState<ServiceFormData>({
    staff_name: '',            // 服務人員
    partner_names: [],         // 同行人員（改為陣列）
    timestamp: Timestamp.now(), // 服務時間
    customer_names: [],        // 客戶名稱（改為陣列）
    nationalities: [],         // 國籍（改為陣列）
    job_types: [],            // 工種（改為陣列）
    worker_name: '',          // 工人姓名
    service_feedback_employer: '',  // 雇主反映事項
    service_feedback_worker: '',    // 移工反映事項
    handling_process: '',      // 處理經過
    handling_result: '',       // 處理結果
    total_amount: 0,          // 金額
    worker_signature: '',      // 工人簽名
    employer_signature: '',    // 雇主簽名
    service_signature: '',     // 服務人員簽名
    photo_urls: [],           // 照片 URLs
    shared_info: '',          // 雇主/移工資訊提供
    sub_items: [],            // 收取/交付物件列表
    expenses: [],             // 收支明細列表
    reports: []               // 回報事項列表
  });

  // 照片預覽
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);

  // 載入資料
  useEffect(() => {
    const controller = new AbortController();

    const loadData = async () => {
      const user = getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        setLoading(true);
        console.log('開始載入服務紀錄:', id);

        // 1. 載入主表資料
        const service = await serviceDB.getServiceRecord(id);
        console.log('主表資料:', service);

        if (!service) {
          setError('找不到服務紀錄');
          return;
        }

        // 2. 載入子表資料
        console.log('開始載入子表資料');
        const [subItems, expenses, reports] = await Promise.all([
          subItemDB.getByServiceId(id),
          expenseDB.getByServiceId(id),
          reportDB.getByServiceId(id)
        ]);
        console.log('子表資料:', { subItems, expenses, reports });

        // 3. 載入使用者和客戶資料
        console.log('開始載入使用者和客戶資料');
        const { users } = await userDB.getUsers();
        const staffListData = users.map(user => ({
          id: user.id,
          name: user.name,
          departments: user.departments || []
        }));
        setStaffList(staffListData);

        const customers = await customerDB.getAccessibleCustomers(user);
        console.log('使用者和客戶資料:', { users, customers });

        if (!controller.signal.aborted) {
        // 處理舊資料格式到新格式的轉換
        const convertStringToArray = (value: string | string[] | undefined | null): string[] => {
          if (Array.isArray(value)) return value;
          if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
          return [];
        };

        const convertedServiceData = {
          ...service,
          partner_names: convertStringToArray(service.partner_names || (service as any).partner_name),
          nationalities: convertStringToArray(service.nationalities || (service as any).nationality),
            job_types: convertStringToArray(service.job_types || (service as any).job_type),
            sub_items: subItems || [],
            expenses: expenses || [],
            reports: reports || []
          };

          // 設定表單資料
          setFormData(convertedServiceData);

          // 設定其他狀態
          setCurrentUser(user);
          setPhotoPreviewUrls(service.photo_urls || []);
          setSelectedPartners(staffListData
            .filter(staff => service.partner_names.includes(staff.name))
            .map(staff => staff.id));
          setCustomerList(customers);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('載入資料時發生錯誤:', error);
          setError('載入資料失敗');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => controller.abort();
  }, [id, router]);

  // 處理照片上傳
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      const uploadPromises = files.map(async (file) => {
        return new Promise<{ preview: string; driveUrl: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = reader.result as string;
            try {
              const res = await fetch("/api/upload-to-gas", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  dataUrl: base64,
                  fileName: `photo_${Date.now()}_${file.name}`
                })
              });

              if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
              }

              const result = await res.json();
              if (!result.success) throw new Error(result.error || '回應不成功');

              resolve({
                preview: base64,
                driveUrl: result.fileUrl
              });

            } catch (error) {
              reject(new Error(`照片 ${file.name} 上傳失敗：${error instanceof Error ? error.message : String(error)}`));
            }
          };

          reader.onerror = () => {
            reject(new Error(`無法讀取檔案 ${file.name}`));
          };

          reader.readAsDataURL(file);
        });
      });

      const results = await Promise.all(
        uploadPromises.map(p => p.catch(error => ({ error })))
      );

      const successes = results.filter((r): r is { preview: string; driveUrl: string } => !('error' in r));
      const failures = results.filter((r): r is { error: Error } => 'error' in r);

      if (successes.length > 0) {
        setPhotoPreviewUrls(prev => [...prev, ...successes.map(r => r.preview)]);
        setFormData(prev => ({
          ...prev,
          photo_urls: [...prev.photo_urls, ...successes.map(r => r.driveUrl)]
        }));
      }

      if (failures.length > 0) {
        const failureMessages = failures.map(f => f.error.message).join('\n');
        alert(failureMessages);
      }

    } catch (error) {
      alert(`上傳失敗：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsUploading(false);
    }
  };

  // 刪除照片
  const handleDeletePhoto = (index: number) => {
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      photo_urls: prev.photo_urls.filter((_, i) => i !== index)
    }));
  };

  // 新增收取/交付物件
  const addSubItem = () => {
    const newSubItem: SubItem = {
      service_id: id,
      category: '收取',
      item_name: '',
      quantity: 1,
      note: '',
      created_at: Timestamp.now(),
      updated_at: Timestamp.now()
    };
    setFormData(prev => ({
      ...prev,
      sub_items: [...prev.sub_items, newSubItem]
    }));
  };

  // 更新收取/交付物件
  const updateSubItem = (index: number, field: keyof SubItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      sub_items: prev.sub_items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  // 刪除收取/交付物件
  const removeSubItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sub_items: prev.sub_items.filter((_, i) => i !== index)
    }));
  };

  // 新增收支項目
  const addExpense = () => {
    const newExpense: Expense = {
      service_id: id,
      category: '收入',
      description: '',
      amount: 0,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now()
    };
    setFormData(prev => ({
      ...prev,
      expenses: [...(prev.expenses || []), newExpense]
    }));
  };

  // 更新收支項目
  const updateExpense = (index: number, field: keyof Expense, value: any) => {
    setFormData(prev => ({
      ...prev,
      expenses: (prev.expenses || []).map((item, i) => 
        i === index ? { ...item, [field]: value, updated_at: Timestamp.now() } : item
      )
    }));
  };

  // 刪除收支項目
  const removeExpense = (index: number) => {
    setFormData(prev => ({
      ...prev,
      expenses: (prev.expenses || []).filter((_, i) => i !== index)
    }));
  };

  // 新增回報事項
  const addReport = () => {
    const newReport: Report = {
      service_id: id,
      type: '客戶反映',
      body: '',
      is_urgent: false,
      status: '待處理',
      created_at: Timestamp.now(),
      updated_at: Timestamp.now()
    };
    setFormData(prev => ({
      ...prev,
      reports: [...(prev.reports || []), newReport]
    }));
  };

  // 更新回報事項
  const updateReport = (index: number, field: keyof Report, value: any) => {
    setFormData(prev => ({
      ...prev,
      reports: (prev.reports || []).map((report, i) => 
        i === index ? { ...report, [field]: value, updated_at: Timestamp.now() } : report
      )
    }));
  };

  // 刪除回報事項
  const removeReport = (index: number) => {
    setFormData(prev => ({
      ...prev,
      reports: (prev.reports || []).filter((_, i) => i !== index)
    }));
  };

  // 處理客戶選擇
  const handleCustomerSelect = (selectedCustomers: string[]) => {
    setFormData(prev => ({
      ...prev,
      customer_names: selectedCustomers
    }));
  };

  // 處理員工選擇
  const handleStaffSelect = (selectedStaff: { id: string; name: string }) => {
    setFormData(prev => ({
      ...prev,
      staff_name: selectedStaff.name
    }));
  };

  // 新增處理同行人員選擇的函數
  const handlePartnerChange = (partnerId: string) => {
    setSelectedPartners(prev => {
      const newSelection = prev.includes(partnerId)
        ? prev.filter(id => id !== partnerId)
        : [...prev, partnerId];
      
      // 更新 formData 中的 partner_names
      const selectedNames = newSelection.map(id => 
        staffList.find(staff => staff.id === id)?.name || ''
      ).filter(Boolean);
      
      setFormData(prev => ({
        ...prev,
        partner_names: selectedNames
      }));

      return newSelection;
    });
  };

  // 取得已排序的人員列表
  const getSortedStaffList = () => {
    // 過濾出行政和服務部門的人員
    const eligibleStaff = staffList.filter(user => 
      user.departments && // 確保 departments 存在
      (user.departments.includes('行政') || user.departments.includes('服務')) &&
      user.id !== currentUser?.id &&
      user.id !== 'admin'
    );

    // 將已選擇的人員排在前面
    return eligibleStaff.sort((a, b) => {
      const aSelected = selectedPartners.includes(a.id);
      const bSelected = selectedPartners.includes(b.id);
      
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      
      // 如果選擇狀態相同，按姓名排序
      return a.name.localeCompare(b.name);
    });
  };

  // 提交表單
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // 更新主表和子表
      await serviceDB.updateServiceRecord(id, {
        ...formData,
        sub_items: formData.sub_items,
        expenses: formData.expenses,
        reports: formData.reports
      });

      // 導航到詳情頁面
      router.push(`/services/${id}`);
    } catch (error) {
      console.error('更新服務紀錄時發生錯誤:', error);
      alert('更新失敗');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-gray-600">載入中...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">編輯服務紀錄</h1>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
            >
              取消
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              儲存
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* 基本資訊 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">基本資訊</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">服務時間</label>
                <input
                  type="datetime-local"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={format(formData.timestamp.toDate(), "yyyy-MM-dd'T'HH:mm")}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    setFormData({
                      ...formData,
                      timestamp: Timestamp.fromDate(newDate)
                    });
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">同行人員</label>
                <MultiSelectCombobox
                  options={getSortedStaffList()}
                  selected={selectedPartners}
                  onChange={handlePartnerChange}
                  placeholder="搜尋同行人員..."
                  displayValue={(staff) => `${staff.name}（${staff.departments?.join('/')}）`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">客戶名稱</label>
                <select
                  value={formData.customer_names.join(',')}
                  onChange={(e) => handleCustomerSelect(e.target.value.split(','))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                  required
                >
                  <option value="">請選擇</option>
                  {customerList.map(customer => (
                    <option key={customer.id} value={customer.name}>{customer.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">工人姓名</label>
                <input
                  type="text"
                  value={formData.worker_name}
                  onChange={(e) => setFormData({...formData, worker_name: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">國籍</label>
                <div className="space-y-2 border rounded-md p-2">
                  {NATIONALITIES.map(nationality => (
                    <label key={nationality} className="flex items-center space-x-2 p-2 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.nationalities.includes(nationality)}
                        onChange={(e) => {
                          const newNationalities = e.target.checked
                            ? [...formData.nationalities, nationality]
                            : formData.nationalities.filter(n => n !== nationality);
                          setFormData({...formData, nationalities: newNationalities});
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 bg-gray-100"
                      />
                      <span className="text-sm text-gray-700">{nationality}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">工種</label>
                <div className="space-y-2 border rounded-md p-2">
                  {JOB_TYPES.map(jobType => (
                    <label key={jobType} className="flex items-center space-x-2 p-2 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.job_types.includes(jobType)}
                        onChange={(e) => {
                          const newJobTypes = e.target.checked
                            ? [...formData.job_types, jobType]
                            : formData.job_types.filter(t => t !== jobType);
                          setFormData({...formData, job_types: newJobTypes});
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 bg-gray-100"
                      />
                      <span className="text-sm text-gray-700">{jobType}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 服務內容 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">服務內容</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">雇主反映事項</label>
                <textarea
                  value={formData.service_feedback_employer}
                  onChange={(e) => setFormData({...formData, service_feedback_employer: e.target.value})}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">移工反映事項</label>
                <textarea
                  value={formData.service_feedback_worker}
                  onChange={(e) => setFormData({...formData, service_feedback_worker: e.target.value})}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">處理經過</label>
                <textarea
                  value={formData.handling_process}
                  onChange={(e) => setFormData({...formData, handling_process: e.target.value})}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">處理結果</label>
                <textarea
                  value={formData.handling_result}
                  onChange={(e) => setFormData({...formData, handling_result: e.target.value})}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* 收取/交付物件 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">收取/交付物件</h2>
              <button
                type="button"
                onClick={addSubItem}
                className="bg-blue-100 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-200"
              >
                新增物件
              </button>
            </div>
            <div className="space-y-4">
              {formData.sub_items.map((item, index) => (
                <div key={index} className="flex items-center space-x-4 border p-2 rounded">
                  <div className="w-1/4">
                    <select
                      value={item.category}
                      onChange={(e) => updateSubItem(index, 'category', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm bg-gray-100"
                    >
                      <option value="收取">收取</option>
                      <option value="交付">交付</option>
                    </select>
                  </div>
                  <div className="w-1/4">
                    <input
                      type="text"
                      value={item.item_name}
                      onChange={(e) => updateSubItem(index, 'item_name', e.target.value)}
                      placeholder="物品名稱"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm bg-gray-100 h-10"
                    />
                  </div>
                  <div className="w-1/4">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateSubItem(index, 'quantity', parseInt(e.target.value))}
                      min="1"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm bg-gray-100 h-10"
                    />
                  </div>
                  <div className="w-1/4">
                    <input
                      type="text"
                      value={item.note}
                      onChange={(e) => updateSubItem(index, 'note', e.target.value)}
                      placeholder="備註"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm bg-gray-100 h-10"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSubItem(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    刪除
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 收支明細 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">收支明細</h2>
              <button
                type="button"
                onClick={addExpense}
                className="bg-blue-100 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-200"
              >
                新增收支
              </button>
            </div>
            <div className="space-y-4">
              {formData.expenses.map((expense, index) => (
                <div key={index} className="flex items-center space-x-4 border p-2 rounded">
                  <div className="w-1/4">
                    <select
                      value={expense.category}
                      onChange={(e) => updateExpense(index, 'category', e.target.value as '收入' | '支出')}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm bg-gray-100"
                    >
                      <option value="收入">收入</option>
                      <option value="支出">支出</option>
                    </select>
                  </div>
                  <div className="w-1/4">
                    <input
                      type="number"
                      value={expense.amount}
                      onChange={(e) => updateExpense(index, 'amount', Number(e.target.value))}
                      placeholder="金額"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm bg-gray-100 h-10"
                    />
                  </div>
                  <div className="w-2/4">
                    <input
                      type="text"
                      value={expense.description}
                      onChange={(e) => updateExpense(index, 'description', e.target.value)}
                      placeholder="說明"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm bg-gray-100 h-10"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newExpenses = formData.expenses.filter((_, i) => i !== index);
                      // 重新計算總金額
                      const totalAmount = newExpenses.reduce((sum, exp) => {
                        const amount = Math.abs(exp.amount);
                        return sum + (exp.category === '收入' ? amount : -amount);
                      }, 0);
                      
                      setFormData(prev => ({ 
                        ...prev, 
                        expenses: newExpenses,
                        total_amount: totalAmount
                      }));
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    刪除
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 回報事項 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">回報事項</h2>
              <button
                type="button"
                onClick={addReport}
                className="bg-blue-100 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-200"
              >
                新增回報
              </button>
            </div>
            <div className="space-y-4">
              {formData.reports.map((report, index) => (
                <div key={index} className="border p-4 rounded">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">回報類型</label>
                        <select
                          value={report.type}
                          onChange={(e) => {
                            const newReports = [...formData.reports];
                            newReports[index] = {
                              ...report,
                              type: e.target.value as '客戶反映' | '移工反映' | '其他'
                            };
                            setFormData(prev => ({ ...prev, reports: newReports }));
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                        >
                          <option value="客戶反映">客戶反映</option>
                          <option value="移工反映">移工反映</option>
                          <option value="其他">其他</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">處理狀態</label>
                        <select
                          value={report.status}
                          onChange={(e) => {
                            const newReports = [...formData.reports];
                            newReports[index] = {
                              ...report,
                              status: e.target.value as '待處理' | '處理中' | '已完成'
                            };
                            setFormData(prev => ({ ...prev, reports: newReports }));
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                        >
                          <option value="待處理">待處理</option>
                          <option value="處理中">處理中</option>
                          <option value="已完成">已完成</option>
                        </select>
                      </div>
                      <div className="flex items-center">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={report.is_urgent}
                            onChange={(e) => {
                              const newReports = [...formData.reports];
                              newReports[index] = {
                                ...report,
                                is_urgent: e.target.checked
                              };
                              setFormData(prev => ({ ...prev, reports: newReports }));
                            }}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500 h-4 w-4 bg-gray-100"
                          />
                          <span className="ml-2 text-sm text-gray-700">緊急事項</span>
                        </label>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newReports = formData.reports.filter((_, i) => i !== index);
                        setFormData(prev => ({ ...prev, reports: newReports }));
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      刪除
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">回報內容</label>
                    <textarea
                      value={report.body}
                      onChange={(e) => {
                        const newReports = [...formData.reports];
                        newReports[index] = {
                          ...report,
                          body: e.target.value,
                          updated_at: Timestamp.now()
                        };
                        setFormData(prev => ({ ...prev, reports: newReports }));
                      }}
                      rows={3}
                      placeholder="回報內容"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                    />
                  </div>
                  {report.handler && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700">處理備註</label>
                      <textarea
                        value={report.handling_note || ''}
                        onChange={(e) => {
                          const newReports = [...formData.reports];
                          newReports[index] = {
                            ...report,
                            handling_note: e.target.value,
                            updated_at: Timestamp.now()
                          };
                          setFormData(prev => ({ ...prev, reports: newReports }));
                        }}
                        rows={2}
                        placeholder="處理備註"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 簽名區塊 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">簽名</h2>
            <div className="space-y-6">
              <SignatureField
                label="雇主簽名"
                value={formData.employer_signature ? { dataUrl: formData.employer_signature, strokes: [] } : undefined}
                onChange={(data) => setFormData({...formData, employer_signature: data?.dataUrl || ''})}
              />
              <SignatureField
                label="工人簽名"
                value={formData.worker_signature ? { dataUrl: formData.worker_signature, strokes: [] } : undefined}
                onChange={(data) => setFormData({...formData, worker_signature: data?.dataUrl || ''})}
              />
              <SignatureField
                label="服務人員簽名"
                value={formData.service_signature ? { dataUrl: formData.service_signature, strokes: [] } : undefined}
                onChange={(data) => setFormData({...formData, service_signature: data?.dataUrl || ''})}
              />
            </div>
          </div>

          {/* 照片上傳區塊 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">照片上傳</h2>
            <div>
              <div className="mb-4">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  disabled={isUploading}
                />
                {isUploading && (
                  <div className="mt-2 text-sm text-blue-600">
                    正在上傳照片...
                  </div>
                )}
              </div>
              {photoPreviewUrls.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {photoPreviewUrls.map((url, index) => {
                    // 將 URL 轉換為直接下載連結
                    const fileId = url.match(/[?&]id=([^&]+)/)?.[1] || url.match(/\/d\/(.+?)\/view/)?.[1];
                    const directUrl = fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1024` : url;
                    
                    return (
                      <div key={index} className="relative group">
                        <img
                          src={directUrl}
                          alt={`上傳照片 ${index + 1}`}
                          className="w-full h-32 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
} 