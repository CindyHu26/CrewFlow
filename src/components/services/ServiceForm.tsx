import { useState, useEffect } from 'react';
import { SignatureField } from '@/components/SignaturePad';
import { ServiceFormData, SubItem, Expense, Report, Service } from '@/types/service';
import { Timestamp } from 'firebase/firestore';
import { Combobox } from '@headlessui/react';
import { MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/20/solid';
import { format } from 'date-fns';

const NATIONALITIES = ['印尼', '越南', '泰國', '菲律賓'] as const;
const JOB_TYPES = ['廠工', '看護工', '幫傭'] as const;
const EXPENSE_ITEMS = [
  '服務費', '機票費', '居留證費', '護照費', '稅金', '冷氣卡費', '住宿費', '修繕費', '辦事處認證費', '意外險費', '代收貸款', '就業安定費', '健保費', '體檢費', '醫藥費', '匯款', '存款', 'IC卡費', '印章費', '照片費', '辦件費'
] as const;
const SUB_ITEMS = [
  '護照', '居留證', '用印文件', '宣導文件', '發票', '請款單', '繳款書', '扣繳憑單', '存摺', '印章', '照片', '冷氣卡'
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
            className="w-full rounded-md border-0 bg-background py-1.5 pl-3 pr-10 text-foreground shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:focus:ring-indigo-500 sm:text-sm sm:leading-6"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
          </Combobox.Button>
        </div>
        <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-background py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {filteredOptions.length === 0 && query !== '' ? (
            <div className="relative cursor-default select-none py-2 px-4 text-gray-700">找不到符合的選項</div>
          ) : (
            filteredOptions.map((option) => (
              <Combobox.Option
                key={option.id}
                value={option.id}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-3 pr-9 ${
                    active ? 'bg-indigo-600 text-white' : 'text-foreground'
                  }`
                }
              >
                {({ selected, active }) => (
                  <>
                    <span className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>
                      {displayValue ? displayValue(option) : option.name}
                    </span>
                    {selected && (
                      <span
                        className={`absolute inset-y-0 right-0 flex items-center pr-4 ${
                          active ? 'text-white' : 'text-indigo-600'
                        }`}
                      >
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </Combobox.Option>
            ))
          )}
        </Combobox.Options>
      </Combobox>
    </div>
  );
}

export default function ServiceForm(props: {
  formData: ServiceFormData;
  setFormData: (data: ServiceFormData) => void;
  staffList: Array<{ id: string; name: string; departments?: string[] }>;
  customerList: Array<{ id: string; name: string; category?: string }>;
  selectedPartners: string[];
  setSelectedPartners: (partners: string[]) => void;
  selectedCustomers: Array<{ id: string; name: string }>;
  setSelectedCustomers: (customers: Array<{ id: string; name: string }>) => void;
  selectedNationalities: string[];
  setSelectedNationalities: (nationalities: string[]) => void;
  selectedJobTypes: string[];
  setSelectedJobTypes: (jobTypes: string[]) => void;
  photoPreviewUrls: string[];
  setPhotoPreviewUrls: (urls: string[]) => void;
  isUploading: boolean;
  setIsUploading: (isUploading: boolean) => void;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleDeletePhoto: (index: number) => void;
  addSubItem: () => void;
  updateSubItem: (index: number, field: keyof SubItem, value: any) => void;
  removeSubItem: (index: number) => void;
  addExpense: () => void;
  updateExpense: (index: number, field: keyof Expense, value: any) => void;
  removeExpense: (index: number) => void;
  addReport: () => void;
  updateReport: (index: number, field: keyof Report, value: any) => void;
  removeReport: (index: number) => void;
  handlePartnerChange: (partnerId: string) => void;
  handleNationalityChange: (nationality: string) => void;
  handleJobTypeChange: (jobType: string) => void;
  handleCustomerChange: (customerId: string) => void;
  handleEmployerFeedbackChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleExpenseItemSelect: (index: number, value: string) => void;
  handleSubItemSelect: (index: number, value: string[]) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  mode: 'create' | 'edit';
  initialData?: Service;
}) {
  const {
    formData,
    setFormData,
    staffList,
    customerList,
    selectedPartners,
    setSelectedPartners,
    selectedCustomers,
    setSelectedCustomers,
    selectedNationalities,
    setSelectedNationalities,
    selectedJobTypes,
    setSelectedJobTypes,
    photoPreviewUrls,
    setPhotoPreviewUrls,
    isUploading,
    setIsUploading,
    handlePhotoUpload,
    handleDeletePhoto,
    addSubItem,
    updateSubItem,
    removeSubItem,
    addExpense,
    updateExpense,
    removeExpense,
    addReport,
    updateReport,
    removeReport,
    handlePartnerChange,
    handleNationalityChange,
    handleJobTypeChange,
    handleCustomerChange,
    handleEmployerFeedbackChange,
    handleExpenseItemSelect,
    handleSubItemSelect,
    handleSubmit,
    mode = 'create',
    initialData
  } = props;

  // 初始化表單資料
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      console.log('初始化表單資料:', initialData);
      // 設定基本資料
      setFormData({
        service_date: format(initialData.timestamp.toDate(), 'yyyy-MM-dd'),
        handling_process: initialData.handling_process,
        handling_result: initialData.handling_result,
        customer_id: initialData.customer_id,
        signature: initialData.signature,
        service_feedback_employer: initialData.service_feedback_employer,
        service_feedback_worker: initialData.service_feedback_worker,
        expenses: initialData.expenses || [],
        sub_items: initialData.sub_items || [],
        reports: initialData.reports || [],
        photos: initialData.photos || [],
        created_at: initialData.created_at,
        updated_at: initialData.updated_at,
        status: initialData.status,
        customer_names: initialData.customer_names || [],
        staff_name: initialData.staff_name,
        partner_names: initialData.partner_names || [],
        photo_urls: initialData.photo_urls || [],
        timestamp: initialData.timestamp,
        worker_name: initialData.worker_name,
        employer_signature: initialData.employer_signature,
        worker_signature: initialData.worker_signature,
        service_signature: initialData.service_signature,
        shared_info: initialData.shared_info,
        total_amount: initialData.total_amount,
        nationalities: initialData.nationalities || [],
        job_types: initialData.job_types || []
      });

      // 設定照片預覽
      if (initialData.photo_urls) {
        setPhotoPreviewUrls(initialData.photo_urls);
      }

      // 設定合作夥伴
      if (initialData.partner_names) {
        setSelectedPartners(initialData.partner_names);
      }

      // 設定國籍
      if (initialData.nationalities) {
        setSelectedNationalities(initialData.nationalities);
      }

      // 設定工作類型
      if (initialData.job_types) {
        setSelectedJobTypes(initialData.job_types);
      }
    }
  }, [mode, initialData]);

  return (
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
            <label htmlFor="customer" className="block text-sm font-medium text-gray-700">
              客戶
            </label>
            <MultiSelectCombobox
              options={customerList}
              selected={selectedCustomers.map(c => c.id)}
              onChange={handleCustomerChange}
              placeholder="搜尋客戶..."
              showCategory={true}
              displayValue={(option) => `${option.name}${option.category ? ` (${option.category})` : ''}`}
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
              options={staffList}
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
                    value={expense.item}
                    onChange={(e) => updateExpense(index, 'item', e.target.value)}
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
                  value={report.content}
                  onChange={(e) => updateReport(index, 'content', e.target.value)}
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
          onClick={() => window.history.back()}
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
  );
} 