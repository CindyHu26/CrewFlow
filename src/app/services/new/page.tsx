'use client';

import { useState, useEffect } from 'react';
import { SignatureField } from '@/components/SignaturePad';
import { ServiceFormData, SubItem, Expense, Report } from '@/types/service';
import { useRouter } from 'next/navigation';
import { serviceDB, subItemDB, expenseDB, userDB, reportDB, updateSubTables } from '@/lib/serviceDB';
import { customerDB } from '@/lib/customerDB';
import { getCurrentUser } from '@/lib/auth';
import { Timestamp, doc, getDoc } from 'firebase/firestore';
import { Combobox } from '@headlessui/react';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { db } from '@/lib/firebase';

// 定義常數
const NATIONALITIES = ['印尼', '越南', '泰國', '菲律賓'] as const;
const JOB_TYPES = ['廠工', '看護工', '幫傭'] as const;

const EXPENSE_ITEMS = [
  '服務費',
  '機票費',
  '居留證費',
  '護照費',
  '稅金',
  '冷氣卡費',
  '住宿費',
  '修繕費',
  '辦事處認證費',
  '意外險費',
  '代收貸款',
  '就業安定費',
  '健保費',
  '體檢費',
  '醫藥費',
  '匯款',
  '存款',
  'IC卡費',
  '印章費',
  '照片費',
  '辦件費'
] as const;

const SUB_ITEMS = [
  '護照',
  '居留證',
  '用印文件',
  '宣導文件',
  '發票',
  '請款單',
  '繳款書',
  '扣繳憑單',
  '存摺',
  '印章',
  '照片',
  '冷氣卡'
] as const;

function SearchableSelect({ 
  options, 
  selected, 
  onChange, 
  placeholder,
  displayValue 
}: { 
  options: { id: string; name: string; category?: string }[];
  selected: string;
  onChange: (value: string) => void;
  placeholder: string;
  displayValue?: (option: { id: string; name: string; category?: string }) => string;
}) {
  const [query, setQuery] = useState('');

  const filteredOptions = query === ''
    ? options
    : options.filter((option) => {
        return option.name.toLowerCase().includes(query.toLowerCase()) ||
               option.id.toLowerCase().includes(query.toLowerCase()) ||
               (option.category && option.category.toLowerCase().includes(query.toLowerCase()));
      });

  const selectedOption = options.find(option => option.id === selected);

  return (
    <Combobox as="div" value={selected} onChange={onChange}>
      <div className="relative mt-2">
        <div className="relative">
          <Combobox.Input
            className="w-full rounded-md border-0 bg-white py-1.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            displayValue={() => selectedOption ? (displayValue ? displayValue(selectedOption) : selectedOption.name) : ''}
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </Combobox.Button>
        </div>

        <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {filteredOptions.length === 0 && query !== '' ? (
            <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
              找不到符合的客戶
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
                {({ active, selected }) => (
                  <div className="flex items-center">
                    <span className={`truncate ${selected ? 'font-semibold' : 'font-normal'}`}>
                      {displayValue ? displayValue(option) : option.name}
                    </span>
                    {option.category && (
                      <span className={`ml-2 truncate text-sm ${
                        active ? 'text-indigo-200' : 'text-gray-500'
                      }`}>
                        {option.category}
                      </span>
                    )}
                  </div>
                )}
              </Combobox.Option>
            ))
          )}
        </Combobox.Options>
      </div>
    </Combobox>
  );
}

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

export default function NewServicePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string; departments: string[] }>>([]);
  const [customerList, setCustomerList] = useState<Array<{ id: string; name: string; category?: '工廠' | '個人' | '養護機構' }>>([]);
  const [selectedPartners, setSelectedPartners] = useState<string[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Array<{ 
    id: string; 
    name: string;
    authorized_users?: string[];
    category?: '工廠' | '個人' | '養護機構';
  }>>([]);
  const [selectedNationalities, setSelectedNationalities] = useState<string[]>([]);
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);

  // 載入使用者資料和列表
  useEffect(() => {
    const loadData = async () => {
      const user = getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        setCurrentUser(user);
        // 直接查 Firestore 取得個人簽名
        const userDocSnap = await getDoc(doc(db, 'users', user.id));
        const signature = userDocSnap.exists() ? userDocSnap.data().signature || '' : '';
        setFormData(prev => ({
          ...prev,
          staff_name: user.name || '',
          timestamp: Timestamp.now(),
          service_signature: signature || ''
        }));

        // 載入同行人員列表（包含部門資訊）
        const { users } = await userDB.getUsers();
        setStaffList(users.map(user => ({
          id: user.id,
          name: user.name,
          departments: user.departments || []
        })));

        // 載入客戶列表
        const customers = await customerDB.getCustomersByStaff(user.employee_id);
        setCustomerList(customers.map(customer => ({
          id: customer.id,
          name: customer.name,
          category: customer.category
        })));
      } catch (error) {
        console.error('載入資料時發生錯誤:', error);
        // TODO: 顯示錯誤訊息
      }
    };

    loadData();
  }, []);

  const [formData, setFormData] = useState<ServiceFormData>({
    staff_name: '',            // 服務人員
    partner_names: [],         // 同行人員（陣列）
    timestamp: Timestamp.now(), // 服務時間
    customer_names: [],        // 客戶名稱（陣列）
    nationalities: [],         // 國籍（陣列）
    job_types: [],            // 工種（陣列）
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
    sub_items: [],             // 收取/交付物件列表
    expenses: [],             // 收支明細列表
    reports: []               // 回報事項列表
  });

  // 新增照片預覽狀態
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

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

              console.log("🔁 回應狀態：", res.status, res.statusText);

              const result = await res.json();
              if (!result.success) throw new Error(result.error || '回應不成功');
              console.log("✅ 成功上傳：", result.fileUrl);

              resolve({
                preview: base64,
                driveUrl: result.fileUrl
              });

            } catch (error) {
              console.error("❌ 上傳發生錯誤：", error);
              reject(new Error(`❌ 照片 ${file.name} 上傳失敗：${error instanceof Error ? error.message : String(error)}`));
            }
          };

          reader.onerror = () => {
            const error = `無法讀取檔案 ${file.name}`;
            console.error("❌", error);
            reject(new Error(error));
          };

          reader.readAsDataURL(file);
        });
      });

      // 等待所有照片上傳完成
      const results = await Promise.all(
        uploadPromises.map(p => p.catch(error => ({ error })))
      );

      // 分離成功和失敗的結果
      const successes = results.filter((r): r is { preview: string; driveUrl: string } => !('error' in r));
      const failures = results.filter((r): r is { error: Error } => 'error' in r);

      // 更新成功上傳的照片
      if (successes.length > 0) {
        setPhotoPreviewUrls(prev => [...prev, ...successes.map(r => r.preview)]);
        setFormData(prev => ({
          ...prev,
          photo_urls: [...prev.photo_urls, ...successes.map(r => r.driveUrl)]
        }));
      }

      // 顯示失敗訊息
      if (failures.length > 0) {
        const failureMessages = failures.map(f => f.error.message).join('\n');
        console.error("❌ 部分照片上傳失敗：", failureMessages);
        alert(failureMessages);
      }

    } catch (error) {
      console.error("❌ 上傳發生錯誤：", error);
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
    const timestamp = Timestamp.now();
    const newSubItem: SubItem = {
      service_id: '',  // 會在儲存時設定
      category: '收取',
      item_name: '',
      quantity: 1,
      note: '',
      created_at: timestamp,
      updated_at: timestamp
    };
    setFormData({
      ...formData,
      sub_items: [...formData.sub_items, newSubItem]
    });
  };

  // 更新收取/交付物件
  const updateSubItem = (index: number, field: keyof SubItem, value: any) => {
    const newSubItems = [...formData.sub_items];
    newSubItems[index] = { ...newSubItems[index], [field]: value };
    setFormData({ ...formData, sub_items: newSubItems });
  };

  // 刪除收取/交付物件
  const removeSubItem = (index: number) => {
    const newSubItems = formData.sub_items.filter((_, i) => i !== index);
    setFormData({ ...formData, sub_items: newSubItems });
  };

  // 新增收支明細
  const addExpense = () => {
    const timestamp = Timestamp.now();
    const newExpense: Expense = {
      service_id: '',  // 會在儲存時設定
      category: '收入',
      description: '',
      amount: 0,
      created_at: timestamp,
      updated_at: timestamp
    };
    setFormData({
      ...formData,
      expenses: [...formData.expenses, newExpense]
    });
  };

  // 更新收支明細
  const updateExpense = (index: number, field: keyof Expense, value: any) => {
    const newExpenses = [...formData.expenses];
    newExpenses[index] = { ...newExpenses[index], [field]: value };

    // 如果更新的是金額或類別，重新計算總金額
    if (field === 'amount' || field === 'category') {
      const totalAmount = newExpenses.reduce((sum, exp) => {
        const amount = Math.abs(exp.amount);
        return sum + (exp.category === '收入' ? amount : -amount);
      }, 0);

      setFormData({
        ...formData,
        expenses: newExpenses,
        total_amount: totalAmount
      });
    } else {
      setFormData({
        ...formData,
        expenses: newExpenses
      });
    }
  };

  // 刪除收支明細
  const removeExpense = (index: number) => {
    const newExpenses = formData.expenses.filter((_, i) => i !== index);
    // 重新計算總金額
    const totalAmount = newExpenses.reduce((sum, exp) => {
      const amount = Math.abs(exp.amount);
      return sum + (exp.category === '收入' ? amount : -amount);
    }, 0);
    
    setFormData({ 
      ...formData, 
      expenses: newExpenses,
      total_amount: totalAmount
    });
  };

  // 新增回報事項
  const addReport = () => {
    const newReport: Report = {
      service_id: '',  // 會在儲存時設定
      type: '客戶反映',
      body: '',
      is_urgent: false,
      status: '待處理',
      created_at: Timestamp.now(),
      updated_at: Timestamp.now()
    };
    setFormData({
      ...formData,
      reports: [...formData.reports, newReport]
    });
  };

  // 更新回報事項
  const updateReport = (index: number, field: keyof Report, value: any) => {
    const newReports = [...formData.reports];
    newReports[index] = { ...newReports[index], [field]: value };
    setFormData({ ...formData, reports: newReports });
  };

  // 刪除回報事項
  const removeReport = (index: number) => {
    const newReports = formData.reports.filter((_, i) => i !== index);
    setFormData({ ...formData, reports: newReports });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const timestamp = Timestamp.now();
      
      // 設定當前使用者為服務人員
      const updatedData = {
        ...formData,
        staff_name: user.name || ''
      };

      // 建立服務紀錄
      const serviceId = await serviceDB.createServiceRecord(updatedData);

      // 儲存收取/交付物件
      for (const item of formData.sub_items) {
        await subItemDB.createSubItem({
          ...item,
          service_id: serviceId,
          created_at: timestamp,
          updated_at: timestamp
        });
      }

      // 儲存收支明細
      for (const expense of formData.expenses) {
        await expenseDB.createExpense({
          ...expense,
          service_id: serviceId,
          created_at: timestamp,
          updated_at: timestamp
        });
      }

      // 儲存回報事項
      for (const report of formData.reports) {
        await reportDB.createReport({
          ...report,
          service_id: serviceId,
          created_at: timestamp,
          updated_at: timestamp
        });
      }

      router.push('/services');
    } catch (error) {
      console.error('建立服務紀錄時發生錯誤:', error);
      // TODO: 顯示錯誤訊息
    }
  };

  // 格式化子表顯示
  const formatSubItems = () => {
    return formData.sub_items.map(item => 
      `${item.category}: ${item.item_name} (${item.quantity}份)${item.note ? ` - ${item.note}` : ''}`
    ).join('\n');
  };

  const formatExpenses = () => {
    return formData.expenses.map(exp => 
      `${exp.category}: ${exp.description} (${Math.abs(exp.amount)}元)`
    ).join('\n');
  };

  // 處理同行人員複選
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

  // 處理國籍複選
  const handleNationalityChange = (nationality: string) => {
    setSelectedNationalities(prev => {
      const newSelection = prev.includes(nationality)
        ? prev.filter(n => n !== nationality)
        : [...prev, nationality];
      
      setFormData(prev => ({
        ...prev,
        nationalities: newSelection
      }));

      return newSelection;
    });
  };

  // 處理工種複選
  const handleJobTypeChange = (jobType: string) => {
    setSelectedJobTypes(prev => {
      const newSelection = prev.includes(jobType)
        ? prev.filter(j => j !== jobType)
        : [...prev, jobType];
      
      setFormData(prev => ({
        ...prev,
        job_types: newSelection
      }));

      return newSelection;
    });
  };

  // 當選擇客戶時，更新同行人員列表和預設工種
  const handleCustomerChange = async (customerId: string) => {
    try {
      // 檢查是否已經選擇了這個客戶
      const isSelected = selectedCustomers.some(customer => customer.id === customerId);
      
      if (isSelected) {
        // 如果已經選擇了，就移除這個客戶
        setSelectedCustomers(prev => prev.filter(customer => customer.id !== customerId));
        setFormData(prev => ({
          ...prev,
          customer_names: prev.customer_names.filter(name => 
            name !== selectedCustomers.find(c => c.id === customerId)?.name
          )
        }));
      } else {
        // 如果還沒選擇，就新增這個客戶
        const customerData = await customerDB.getCustomer(customerId, currentUser);
      if (customerData) {
          const newCustomer = {
            id: customerData.id,
            name: customerData.name,
            authorized_users: customerData.authorized_users,
            category: customerData.category
          };
          
          setSelectedCustomers(prev => [...prev, newCustomer]);
        setFormData(prev => ({
          ...prev,
            customer_names: [...prev.customer_names, customerData.name]
          }));

          // 根據客戶類別設定預設工種（如果還沒有設定的話）
          if (customerData.category && selectedJobTypes.length === 0) {
            let defaultJobType = '看護工';  // 預設為看護工
            if (customerData.category === '工廠') {
              defaultJobType = '廠工';
            }
          setSelectedJobTypes([defaultJobType]);
          setFormData(prev => ({
            ...prev,
              job_types: [defaultJobType]
          }));
        }

          // 合併所有已選擇客戶的授權使用者
          const allAuthorizedUsers = new Set<string>();
          [...selectedCustomers, newCustomer].forEach(customer => {
            (customer.authorized_users || []).forEach(userId => {
              if (userId !== currentUser?.employee_id && userId !== 'admin') {
                allAuthorizedUsers.add(userId);
              }
            });
          });

          // 更新同行人員（保留現有的選擇）
          const defaultPartners = Array.from(allAuthorizedUsers);
          setSelectedPartners(prev => {
            const newPartners = new Set([...prev, ...defaultPartners]);
            return Array.from(newPartners);
          });
          
          // 取得同行人員的名稱
          const partnerNames = staffList
            .filter(staff => defaultPartners.includes(staff.id))
            .map(staff => staff.name);
          
        setFormData(prev => ({
          ...prev,
            partner_names: partnerNames
        }));
        }
      }
    } catch (error) {
      console.error('載入客戶詳細資料時發生錯誤:', error);
    }
  };

  // 監聽雇主反映事項的變更
  const handleEmployerFeedbackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, service_feedback_employer: value }));

    // 檢查是否包含關鍵字
    if (value.includes('送工') || value.includes('送新工')) {
      // 在雇主反映事項後面加上換行和額外文字
      setFormData(prev => ({
        ...prev,
        service_feedback_employer: value + '\n宣導公司相關規定及附件法條，文件簽名',
        handling_process: '宿舍保持乾淨，禁止帶外人過夜，不得影響他人居住品質。\n一旦發現將予以懲處。',
        handling_result: '請遵守相關規定',
        shared_info: `就業服務法 @https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=N0090001 

第 5 條
1. 為保障國民就業機會平等，雇主對求職人或所僱用員工，不得以種族、階級、語言、思想、宗教、黨派、籍貫、出生地、性別、性傾向、年齡、婚姻、容貌、五官、身心障礙、星座、血型或以往工會會員身分為由，予以歧視；其他法律有明文規定者，從其規定。  
2. 雇主招募或僱用員工，不得有下列情事：  
一、為不實之廣告或揭示。  
二、違反求職人或員工之意思，留置其國民身分證、工作憑證或其他證明文件，或要求提供非屬就業所需之隱私資料。  
三、扣留求職人或員工財物或收取保證金。  
四、指派求職人或員工從事違背公共秩序或善良風俗之工作。  
五、辦理聘僱外國人之申請許可、招募、引進或管理事項，提供不實資料或健康檢查檢體。  
六、提供職缺之經常性薪資未達新臺幣四萬元而未公開揭示或告知其薪資範圍。  

第 54 條
1. 雇主聘僱外國人從事第四十六條第一項第八款至第十一款規定之工作，有下列情事之一者，中央主管機關應不予核發招募許可、聘僱許可或展延聘僱許可之一部或全部；其已核發招募許可者，得中止引進：  
一、於外國人預定工作之場所有第十條規定之罷工或勞資爭議情事。  
二、於國內招募時，無正當理由拒絕聘僱公立就業服務機構所推介之人員或自行前往求職者。  
三、聘僱之外國人行蹤不明或藏匿外國人達一定人數或比率。  
四、曾非法僱用外國人工作。  
五、曾非法解僱本國勞工。  
六、因聘僱外國人而降低本國勞工勞動條件，經當地主管機關查證屬實。  
七、聘僱之外國人妨害社區安寧秩序，經依社會秩序維護法裁處。  
八、曾非法扣留或侵占所聘僱外國人之護照、居留證件或財物。  
九、所聘僱外國人遣送出國所需旅費及收容期間之必要費用，經限期繳納屆期不繳納。  
十、於委任招募外國人時，向私立就業服務機構要求、期約或收受不正利益。  
十一、於辦理聘僱外國人之申請許可、招募、引進或管理事項，提供不實或失效資料。  
十二、刊登不實之求才廣告。  
十三、不符申請規定經限期補正，屆期未補正。  
十四、違反本法或依第四十八條第二項、第三項、第四十九條所發布之命令。  
十五、違反職業安全衛生法規定，致所聘僱外國人發生死亡、喪失部分或全部工作能力，且未依法補償或賠償。  
十六、其他違反保護勞工之法令情節重大者。  
2. 前項第三款至第十六款規定情事，以申請之日前二年內發生者為限。  
3. 第一項第三款之人數、比率，由中央主管機關公告之。  

第 55 條
1. 雇主聘僱外國人從事第四十六條第一項第八款至第十款規定之工作，應向中央主管機關設置之就業安定基金專戶繳納就業安定費，作為加強辦理有關促進國民就業、提升勞工福祉及處理有關外國人聘僱管理事務之用。  
2. 前項就業安定費之數額，由中央主管機關考量國家經濟發展、勞動供需及相關勞動條件，並依其行業別及工作性質會商相關機關定之。  
3. 雇主或被看護者符合社會救助法規定之低收入戶或中低收入戶、依身心障礙者權益保障法領取生活補助費，或依老人福利法領取中低收入生活津貼者，其聘僱外國人從事第四十六條第一項第九款規定之家庭看護工作，免繳納第一項之就業安定費。  
4. 第一項受聘僱之外國人有連續曠職三日失去聯繫或聘僱關係終止之情事，經雇主依規定通知而廢止聘僱許可者，雇主無須再繳納就業安定費。  
5. 雇主未依規定期限繳納就業安定費者，得寬限三十日；於寬限期滿仍未繳納者，自寬限期滿之翌日起至完納前一日止，每逾一日加徵其未繳就業安定費百分之零點三滯納金。但以其未繳之就業安定費百分之三十為限。  
6. 加徵前項滯納金三十日後，雇主仍未繳納者，由中央主管機關就其未繳納之就業安定費及滯納金移送強制執行，並得廢止其聘僱許可之一部或全部。  
7. 主管機關並應定期上網公告基金運用之情形及相關會議紀錄。  

第 57 條
1. 雇主聘僱外國人不得有下列情事：  
一、聘僱未經許可、許可失效或他人所申請聘僱之外國人。  
二、以本人名義聘僱外國人為他人工作。  
三、指派所聘僱之外國人從事許可以外之工作。  
四、未經許可，指派所聘僱從事第四十六條第一項第八款至第十款規定工作之外國人變更工作場所。  
五、未依規定安排所聘僱之外國人接受健康檢查或未依規定將健康檢查結果函報衛生主管機關。  
六、因聘僱外國人致生解僱或資遣本國勞工之結果。  
七、對所聘僱之外國人以強暴脅迫或其他非法之方法，強制其從事勞動。  
八、非法扣留或侵占所聘僱外國人之護照、居留證件或財物。  
九、其他違反本法或依本法所發布之命令。  

第 73 條
1. 雇主聘僱之外國人，有下列情事之一者，廢止其聘僱許可：  
一、為申請許可以外之雇主工作。  
二、非依雇主指派即自行從事許可以外之工作。  
三、連續曠職三日失去聯繫或聘僱關係終止。  
四、拒絕接受健康檢查、提供不實檢體、檢查不合格、身心狀況無法勝任所指派之工作或罹患經中央衛生主管機關指定之傳染病。  
五、違反依第四十八條第二項、第三項、第四十九條所發布之命令，情節重大。  
六、違反其他中華民國法令，情節重大。  
七、依規定應提供資料，拒絕提供或提供不實。  `
      }));
    }
  };

  // 處理收支明細項目選擇
  const handleExpenseItemSelect = (index: number, selectedItem: string) => {
    updateExpense(index, 'description', selectedItem);
  };

  // 處理收取/交付物件項目選擇
  const handleSubItemSelect = (index: number, selectedItems: string[]) => {
    updateSubItem(index, 'item_name', selectedItems.join('、'));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">新增服務紀錄</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本資訊區塊 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">基本資訊</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">服務人員</label>
              <input
                type="text"
                value={formData.staff_name}
                disabled
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">服務時間</label>
              <input
                type="datetime-local"
                value={formData.timestamp ? new Date(formData.timestamp.seconds * 1000).toISOString().slice(0, 16) : ''}
                onChange={(e) => setFormData({
                  ...formData,
                  timestamp: Timestamp.fromDate(new Date(e.target.value))
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">客戶名稱（可複選）</label>
              <MultiSelectCombobox
                options={customerList}
                selected={selectedCustomers.map(c => c.id)}
                onChange={handleCustomerChange}
                placeholder="搜尋客戶..."
                showCategory={true}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">國籍（可複選）</label>
              <div className="space-y-2">
                {NATIONALITIES.map(nationality => (
                  <label key={nationality} className="inline-flex items-center mr-4">
                    <input
                      type="checkbox"
                      checked={selectedNationalities.includes(nationality)}
                      onChange={() => handleNationalityChange(nationality)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                    />
                    <span className="ml-2">{nationality}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">工種（可複選）</label>
              <div className="space-y-2">
                {JOB_TYPES.map(jobType => (
                  <label key={jobType} className="inline-flex items-center mr-4">
                    <input
                      type="checkbox"
                      checked={selectedJobTypes.includes(jobType)}
                      onChange={() => handleJobTypeChange(jobType)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                    />
                    <span className="ml-2">{jobType}</span>
                  </label>
                ))}
              </div>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">同行人員（可複選）</label>
              <MultiSelectCombobox
                options={getSortedStaffList()}
                selected={selectedPartners}
                onChange={handlePartnerChange}
                placeholder="搜尋同行人員..."
                displayValue={(staff) => `${staff.name}（${staff.departments?.join('/')}）`}
              />
            </div>
          </div>
        </div>

        {/* 服務內容區塊 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">服務內容</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">雇主反映事項</label>
              <textarea
                value={formData.service_feedback_employer}
                onChange={handleEmployerFeedbackChange}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">移工反映事項</label>
              <textarea
                value={formData.service_feedback_worker}
                onChange={(e) => setFormData({...formData, service_feedback_worker: e.target.value})}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">處理經過</label>
              <textarea
                value={formData.handling_process}
                onChange={(e) => setFormData({...formData, handling_process: e.target.value})}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">處理結果</label>
              <textarea
                value={formData.handling_result}
                onChange={(e) => setFormData({...formData, handling_result: e.target.value})}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
              />
            </div>
          </div>
        </div>

        {/* 收支明細區塊 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">收支明細</h2>
            <button
              type="button"
              onClick={addExpense}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              新增收支
            </button>
          </div>
          <div className="space-y-2">
            {formData.expenses.map((expense, index) => (
              <div key={index} className="flex items-center space-x-4 border p-2 rounded">
                <div className="w-1/5">
                  <select
                    value={expense.category}
                    onChange={(e) => updateExpense(index, 'category', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm bg-gray-100"
                  >
                    <option value="收入">收入</option>
                    <option value="支出">支出</option>
                  </select>
                </div>
                <div className="w-2/5">
                  <div className="relative">
                  <input
                    type="text"
                    value={expense.description}
                    onChange={(e) => updateExpense(index, 'description', e.target.value)}
                    placeholder="說明"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm bg-gray-100 h-10"
                      list={`expense-items-${index}`}
                    />
                    <datalist id={`expense-items-${index}`}>
                      {EXPENSE_ITEMS.map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                  </div>
                </div>
                <div className="w-1/5">
                  <input
                    type="number"
                    value={Math.abs(expense.amount)}
                    onChange={(e) => updateExpense(index, 'amount', parseInt(e.target.value))}
                    placeholder="金額"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm bg-gray-100 h-10"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeExpense(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  刪除
                </button>
              </div>
            ))}
          </div>
          {/* 總金額顯示 */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <label className="text-lg font-medium text-gray-900">總金額</label>
              <div className="text-xl font-semibold">
                <span className={formData.total_amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formData.total_amount >= 0 ? '+' : ''}{formData.total_amount} 元
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 收取/交付物件區塊 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">收取/交付物件</h2>
            <button
              type="button"
              onClick={addSubItem}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              新增物件
            </button>
          </div>
          <div className="space-y-2">
            {formData.sub_items.map((item, index) => (
              <div key={index} className="flex items-center space-x-4 border p-2 rounded">
                <div className="w-1/6">
                  <select
                    value={item.category}
                    onChange={(e) => updateSubItem(index, 'category', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm bg-gray-100"
                  >
                    <option value="收取">收取</option>
                    <option value="交付">交付</option>
                  </select>
                </div>
                <div className="w-1/3">
                  <div className="relative">
                  <input
                    type="text"
                    value={item.item_name}
                    onChange={(e) => updateSubItem(index, 'item_name', e.target.value)}
                    placeholder="物件名稱"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm bg-gray-100 h-10"
                      list={`sub-items-${index}`}
                    />
                    <datalist id={`sub-items-${index}`}>
                      {SUB_ITEMS.map((subItem) => (
                        <option key={subItem} value={subItem} />
                      ))}
                    </datalist>
                  </div>
                </div>
                <div className="w-1/6">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateSubItem(index, 'quantity', parseInt(e.target.value))}
                    placeholder="數量"
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
                {photoPreviewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
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
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 其他資訊區塊 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">其他資訊</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">雇主/移工資訊提供</label>
            <textarea
              value={formData.shared_info}
              onChange={(e) => setFormData({...formData, shared_info: e.target.value})}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
            />
          </div>
        </div>

        {/* 回報事項區塊 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">回報事項</h2>
            <button
              type="button"
              onClick={addReport}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              新增回報
            </button>
          </div>
          <div className="space-y-4">
            {formData.reports.map((report, index) => (
              <div key={index} className="border p-4 rounded-lg space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">回報類型</label>
                      <select
                        value={report.type}
                        onChange={(e) => updateReport(index, 'type', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                      >
                        <option value="客戶反映">客戶反映</option>
                        <option value="移工反映">移工反映</option>
                        <option value="其他">其他</option>
                      </select>
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={report.is_urgent}
                          onChange={(e) => updateReport(index, 'is_urgent', e.target.checked)}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500 h-4 w-4 bg-gray-100"
                        />
                        <span className="ml-2 text-sm text-gray-700">緊急事項</span>
                      </label>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeReport(index)}
                    className="ml-4 text-red-600 hover:text-red-800"
                  >
                    刪除
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">回報內容</label>
                  <textarea
                    value={report.body}
                    onChange={(e) => updateReport(index, 'body', e.target.value)}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 提交按鈕 */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            取消
          </button>
          <button
            type="submit"
            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            儲存
          </button>
        </div>
      </form>
    </div>
  );
} 