'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrentUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format } from 'date-fns';
import { User } from '@/types';
import Card from '@/components/Card';

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    type: string;
    reason: string;
    username: string;
    proxyNames?: string[];
  };
};

export default function LeaveCalendarPage() {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableDeputies, setAvailableDeputies] = useState<User[]>([]);

  useEffect(() => {
    // 先載入 users
    const fetchUsers = async () => {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as User);
      setAvailableDeputies(users);
      console.log('載入的 users:', users);
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (availableDeputies.length === 0) return; // 等 users 載入完
    // 再查詢 leaves 並處理事件資料
    const loadData = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }

      try {
        // 獲取已審核的請假申請
        const q = query(
          collection(db, 'leaves'),
          where('status', '==', 'approved')
        );
        
        const querySnapshot = await getDocs(q);
        const eventsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('請假資料:', data);
          
          const startDate = data.startDateTime instanceof Date ? 
            data.startDateTime : 
            new Date(data.startDateTime.seconds * 1000);
          const endDate = data.endDateTime instanceof Date ? 
            data.endDateTime : 
            new Date(data.endDateTime.seconds * 1000);

          // 根據請假類型設定顏色
          let backgroundColor = '#4CAF50'; // 預設綠色
          let borderColor = '#388E3C';
          let textColor = '#FFFFFF';

          switch (data.type) {
            case '特休':
              backgroundColor = '#2196F3'; // 藍色
              borderColor = '#1976D2';
              break;
            case '病假':
              backgroundColor = '#F44336'; // 紅色
              borderColor = '#D32F2F';
              break;
            case '事假':
              backgroundColor = '#FF9800'; // 橙色
              borderColor = '#F57C00';
              break;
            case '公假':
              backgroundColor = '#00BCD4'; // 青色
              borderColor = '#0097A7';
              break;
            case '其他':
              backgroundColor = '#9C27B0'; // 紫色
              borderColor = '#7B1FA2';
              break;
          }

          // 處理代理人資料
          const proxyNames = data.approvalFlow?.deputies
            ?.filter((deputy: any) => deputy?.status === 'approved')
            .map((deputy: any) => {
              const deputyId = (deputy?.id || '').trim();
              const deputyUser = availableDeputies.find(user => (user.id || '').trim() === deputyId);
              console.log('比對 deputyId:', deputyId, '所有 user.id:', availableDeputies.map(u => u.id));
              console.log('deputy.id:', deputy?.id, typeof deputy?.id);
              return deputyUser ? deputyUser.name : deputyId;
            }) || [];
          console.log('代理人名單:', proxyNames);

          // 檢查代理人是否全部審核完成
          const allDeputiesApproved = data.approvalFlow?.deputies?.every((d: any) => d?.status !== 'pending') ?? true;

          let pendingApprovers: string[] = [];
          if (!allDeputiesApproved) {
            // 還有代理人沒審核，currentApprovers 只給代理人
            pendingApprovers = data.approvalFlow?.deputies
              ?.filter((d: any) => d?.status === 'pending')
              .map((d: any) => d?.id) || [];
          } else {
            // 代理人都審核完，才往上送
            if (data.approvalFlow?.supervisors?.length > 0) {
              pendingApprovers = data.approvalFlow.supervisors
                .filter((s: any) => s?.status === 'pending')
                .map((s: any) => s?.id) || [];
            } else if (data.approvalFlow?.managers?.length > 0) {
              pendingApprovers = data.approvalFlow.managers
                .filter((m: any) => m?.status === 'pending')
                .map((m: any) => m?.id) || [];
            } else if (data.approvalFlow?.directors?.length > 0) {
              pendingApprovers = data.approvalFlow.directors
                .filter((d: any) => d?.status === 'pending')
                .map((d: any) => d?.id) || [];
            }
          }

          return {
            id: doc.id,
            title: `${data.username}(${data.type})`,
            start: startDate,
            end: endDate,
            backgroundColor,
            borderColor,
            textColor,
            extendedProps: {
              type: data.type,
              reason: data.reason,
              username: data.username,
              proxyNames,
              pendingApprovers
            }
          };
        });

        console.log('處理後的事件資料:', eventsData);
        setEvents(eventsData);
        setLoading(false);
      } catch (error) {
        console.error('載入請假資料時發生錯誤:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [router, availableDeputies]);

  const handleEventClick = (info: any) => {
    const event = info.event;
    const getSafe = (val: any) => (val === null || val === undefined || val === '' ? '無' : val);
    const proxyNames = event.extendedProps.proxyNames?.length > 0 
      ? event.extendedProps.proxyNames.join('、')
      : '無';
    alert(`
請假人：${getSafe(event.extendedProps.username)}
請假類型：${getSafe(event.extendedProps.type)}
請假時間：${event.start ? event.start.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) : '無'} - ${event.end ? event.end.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) : '無'}
請假原因：${getSafe(event.extendedProps.reason)}
代理人及職務相關人員：${proxyNames}
    `);
  };

  if (loading) {
    return (
      <Card className="max-w-7xl mx-auto p-4">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-500">載入中...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="max-w-7xl mx-auto p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          locale="zh-tw"
          timeZone="Asia/Taipei"
          buttonText={{
            today: '今天',
            month: '月',
            week: '週',
            day: '日'
          }}
          views={{
            dayGridMonth: { buttonText: '月' },
            timeGridWeek: { buttonText: '週' },
            timeGridDay: { buttonText: '日' }
          }}
          events={events}
          eventClick={handleEventClick}
          height="auto"
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }}
          slotMinTime="08:00:00"
          slotMaxTime="17:00:00"
          allDaySlot={false}
          nowIndicator={true}
          businessHours={{
            daysOfWeek: [1, 2, 3, 4, 5],
            startTime: '08:00',
            endTime: '17:00',
          }}
        />
    </Card>
  );
} 