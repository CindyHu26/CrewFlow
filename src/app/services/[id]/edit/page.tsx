'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { serviceDB, subItemDB, expenseDB, reportDB } from '@/lib/serviceDB';
import { Service, ServiceFormData, SubItem, Expense, Report } from '@/types/service';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import ServiceForm from '@/components/services/ServiceForm';

export default function EditServicePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>({
    service_date: '',
    handling_process: '',
    handling_result: '',
    customer_id: '',
    signature: '',
    service_feedback_employer: '',
    service_feedback_worker: '',
    expenses: [],
    sub_items: [],
    reports: [],
    photos: [],
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
    status: 'draft',
    customer_names: [],
    staff_name: '',
    partner_names: [],
    photo_urls: [],
    timestamp: Timestamp.now(),
    worker_name: '',
    employer_signature: '',
    worker_signature: '',
    service_signature: '',
    shared_info: '',
    total_amount: 0,
    nationalities: [],
    job_types: []
  });

  // 狀態管理
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string; departments?: string[] }>>([]);
  const [customerList, setCustomerList] = useState<Array<{ id: string; name: string; category?: string }>>([]);
  const [selectedPartners, setSelectedPartners] = useState<string[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedNationalities, setSelectedNationalities] = useState<string[]>([]);
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const user = getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        // 載入服務紀錄
        const serviceData = await serviceDB.getServiceRecord(id);
        if (!serviceData) {
          setError('找不到服務紀錄');
          return;
        }

        // 載入員工列表
        const staff = await serviceDB.getStaffList();
        setStaffList(staff);

        // 載入客戶列表
        const customers = await serviceDB.getCustomerList();
        setCustomerList(customers);

        // 找到對應的客戶資料
        const selectedCustomers = customers.filter(c => 
          serviceData.customer_names?.includes(c.name)
        );
        if (selectedCustomers.length > 0) {
          setSelectedCustomers(selectedCustomers.map(c => ({ 
            id: c.id, 
            name: c.name 
          })));
        }

        // 設定表單資料
        setFormData({
          ...serviceData,
          service_date: format(serviceData.timestamp.toDate(), 'yyyy-MM-dd HH:mm'),
          timestamp: serviceData.timestamp,
          created_at: serviceData.created_at || Timestamp.now(),
          updated_at: Timestamp.now(),
          status: serviceData.status || 'draft',
          total_amount: serviceData.total_amount || 0,
          shared_info: serviceData.shared_info || '',
          expenses: serviceData.expenses || [],
          sub_items: serviceData.sub_items || [],
          reports: serviceData.reports || [],
          customer_names: serviceData.customer_names || []
        });

        // 設定其他狀態
        setSelectedPartners(serviceData.partners || []);
        setSelectedNationalities(serviceData.nationalities || []);
        setSelectedJobTypes(serviceData.job_types || []);
        setPhotoPreviewUrls(serviceData.photos || []);

      } catch (error) {
        console.error('載入資料時發生錯誤:', error);
        setError('載入資料失敗');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadData();
    }
  }, [id, router]);

  // 處理照片上傳
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    setIsUploading(true);
    try {
      const newPhotos = await serviceDB.uploadPhotos(e.target.files);
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...newPhotos]
      }));
      setPhotoPreviewUrls(prev => [...prev, ...newPhotos]);
    } catch (error) {
      console.error('上傳照片時發生錯誤:', error);
      setError('上傳照片失敗');
    } finally {
      setIsUploading(false);
    }
  };

  // 處理照片刪除
  const handleDeletePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // 處理子表項目
  const addSubItem = () => {
    const newSubItem: SubItem = {
      service_id: id,
      category: '',
      item_name: '',
      quantity: 0,
      note: '',
      created_at: Timestamp.now(),
      updated_at: Timestamp.now()
    };
    setFormData(prev => ({
      ...prev,
      sub_items: [...prev.sub_items, newSubItem]
    }));
  };

  const updateSubItem = (index: number, field: keyof typeof formData.sub_items[0], value: any) => {
    setFormData(prev => ({
      ...prev,
      sub_items: prev.sub_items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeSubItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sub_items: prev.sub_items.filter((_, i) => i !== index)
    }));
  };

  // 處理收支明細
  const addExpense = () => {
    const newExpense: Expense = {
      service_id: id,
      category: '',
      item: '',
      amount: 0,
      remark: '',
      created_at: Timestamp.now(),
      updated_at: Timestamp.now()
    };
    setFormData(prev => ({
      ...prev,
      expenses: [...prev.expenses, newExpense]
    }));
  };

  const updateExpense = (index: number, field: keyof typeof formData.expenses[0], value: any) => {
    setFormData(prev => ({
      ...prev,
      expenses: prev.expenses.map((expense, i) => 
        i === index ? { ...expense, [field]: value } : expense
      )
    }));
  };

  const removeExpense = (index: number) => {
    setFormData(prev => ({
      ...prev,
      expenses: prev.expenses.filter((_, i) => i !== index)
    }));
  };

  // 處理回報事項
  const addReport = () => {
    const newReport: Report = {
      service_id: id,
      type: '',
      content: '',
      is_urgent: false,
      status: 'pending',
      created_at: Timestamp.now(),
      updated_at: Timestamp.now()
    };
    setFormData(prev => ({
      ...prev,
      reports: [...prev.reports, newReport]
    }));
  };

  const updateReport = (index: number, field: keyof typeof formData.reports[0], value: any) => {
    setFormData(prev => ({
      ...prev,
      reports: prev.reports.map((report, i) => 
        i === index ? { ...report, [field]: value } : report
      )
    }));
  };

  const removeReport = (index: number) => {
    setFormData(prev => ({
      ...prev,
      reports: prev.reports.filter((_, i) => i !== index)
    }));
  };

  // 處理選擇變更
  const handlePartnerChange = (partnerId: string) => {
    setSelectedPartners(prev => 
      prev.includes(partnerId)
        ? prev.filter(id => id !== partnerId)
        : [...prev, partnerId]
    );
  };

  const handleNationalityChange = (nationality: string) => {
    setSelectedNationalities(prev => 
      prev.includes(nationality)
        ? prev.filter(n => n !== nationality)
        : [...prev, nationality]
    );
  };

  const handleJobTypeChange = (jobType: string) => {
    setSelectedJobTypes(prev => 
      prev.includes(jobType)
        ? prev.filter(t => t !== jobType)
        : [...prev, jobType]
    );
  };

  const handleCustomerChange = async (customerId: string) => {
    const selectedCustomer = customerList.find(c => c.id === customerId);
    if (selectedCustomer) {
      // 檢查是否已經選中該客戶
      const isAlreadySelected = selectedCustomers.some(c => c.id === customerId);
      
      if (isAlreadySelected) {
        // 如果已經選中，則移除該客戶
        setSelectedCustomers(prev => prev.filter(c => c.id !== customerId));
        setFormData(prev => ({
          ...prev,
          customer_names: prev.customer_names.filter(name => name !== selectedCustomer.name),
          customer_id: prev.customer_id === customerId ? '' : prev.customer_id
        }));
      } else {
        // 如果未選中，則添加該客戶
        setSelectedCustomers(prev => [...prev, { id: customerId, name: selectedCustomer.name }]);
        setFormData(prev => ({
          ...prev,
          customer_names: [...(prev.customer_names || []), selectedCustomer.name],
          customer_id: prev.customer_id || customerId // 如果還沒有主要客戶ID，則設定為第一個選擇的客戶
        }));
      }
    }
  };

  const handleEmployerFeedbackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, service_feedback_employer: e.target.value }));
  };

  const handleExpenseItemSelect = (index: number, selectedItem: string) => {
    updateExpense(index, 'item', selectedItem);
  };

  const handleSubItemSelect = (index: number, selectedItems: string[]) => {
    const updatedSubItem = {
      ...formData.sub_items[index],
      item_name: selectedItems[0]
    };
    setFormData(prev => ({
      ...prev,
      sub_items: prev.sub_items.map((item, i) => 
        i === index ? updatedSubItem : item
      )
    }));
  };

  // 處理表單提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    try {
      // 確保日期格式正確
      const serviceDate = new Date(formData.service_date);
      if (isNaN(serviceDate.getTime())) {
        throw new Error('無效的日期格式');
      }

      // 1. 更新主表
      await serviceDB.updateServiceRecord(id, {
        ...formData,
        timestamp: Timestamp.fromDate(serviceDate),
        updated_at: Timestamp.now()
      });

      // 2. 刪除並重建子表資料
      await Promise.all([
        ...formData.sub_items.map(item => subItemDB.createSubItem({ ...item, service_id: id })),
        ...formData.expenses.map(expense => expenseDB.createExpense({ ...expense, service_id: id })),
        ...formData.reports.map(report => reportDB.createReport({ ...report, service_id: id }))
      ]);

      router.push(`/services/${id}`);
    } catch (error) {
      console.error('更新服務紀錄時發生錯誤:', error);
      setError('更新服務紀錄失敗');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-gray-600">載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">編輯服務紀錄</h1>
          
          <ServiceForm
            formData={formData}
            setFormData={setFormData}
            staffList={staffList}
            customerList={customerList}
            selectedPartners={selectedPartners}
            setSelectedPartners={setSelectedPartners}
            selectedCustomers={selectedCustomers}
            setSelectedCustomers={setSelectedCustomers}
            selectedNationalities={selectedNationalities}
            setSelectedNationalities={setSelectedNationalities}
            selectedJobTypes={selectedJobTypes}
            setSelectedJobTypes={setSelectedJobTypes}
            photoPreviewUrls={photoPreviewUrls}
            setPhotoPreviewUrls={setPhotoPreviewUrls}
            isUploading={isUploading}
            setIsUploading={setIsUploading}
            handlePhotoUpload={handlePhotoUpload}
            handleDeletePhoto={handleDeletePhoto}
            addSubItem={addSubItem}
            updateSubItem={updateSubItem}
            removeSubItem={removeSubItem}
            addExpense={addExpense}
            updateExpense={updateExpense}
            removeExpense={removeExpense}
            addReport={addReport}
            updateReport={updateReport}
            removeReport={removeReport}
            handlePartnerChange={handlePartnerChange}
            handleNationalityChange={handleNationalityChange}
            handleJobTypeChange={handleJobTypeChange}
            handleCustomerChange={handleCustomerChange}
            handleEmployerFeedbackChange={handleEmployerFeedbackChange}
            handleExpenseItemSelect={handleExpenseItemSelect}
            handleSubItemSelect={handleSubItemSelect}
            handleSubmit={handleSubmit}
            mode="edit"
          />
        </div>
      </div>
    </div>
  );
} 