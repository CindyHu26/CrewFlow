'use client';

import { Fragment, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { getCurrentUser, logout } from '@/lib/auth';
import { User } from '@/types';

const navigation = [
  { name: '首頁', href: '/dashboard' },
  {
    name: '請假管理',
    href: '#',
    children: [
      { name: '請假申請', href: '/leaves/new' },
      { name: '請假審核', href: '/leaves/review' },
      { name: '請假紀錄', href: '/leaves' },
      { name: '請假日曆', href: '/leaves/calendar' },
    ]
  },
  {
    name: '服務紀錄',
    href: '#',
    children: [
      { name: '服務紀錄管理', href: '/services' },
      { 
        name: '所有服務紀錄', 
        href: '/services/all',
        requireManagerOrAbove: true 
      },
      { name: '新增服務紀錄', href: '/services/new' },
    ]
  },
  { name: '客戶管理', href: '/customers' },
];

// 管理員專用選單
const adminNavigation = [
  { name: '密碼管理', href: '/admin/password' }
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManagerOrAbove, setIsManagerOrAbove] = useState(false);
  const [isHR, setIsHR] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setIsAdmin(currentUser?.id === 'admin');
    // 檢查是否為經理級以上（position_level >= 3）
    setIsManagerOrAbove(
      (currentUser?.position_level ?? 0) >= 3
    );
    // 檢查是否為人資部門
    setIsHR(!!currentUser?.departments && currentUser.departments.includes('人資'));
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('登出時發生錯誤:', error);
    }
  };

  return (
    <Disclosure as="nav" className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-700/50">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex items-center">
                <div className="flex items-center space-x-2">
                  <img
                    className="h-8 w-auto"
                    alt="CrewFlow"
                  />
                  <span className="text-lg font-semibold text-gray-800 dark:text-white">CrewFlow</span>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-8">
                  {navigation.map((item) => (
                    <Fragment key={item.name}>
                      {item.children ? (
                        <Menu as="div" className="relative inline-block text-left">
                          <Menu.Button
                            onClick={() => router.push(item.href)}
                            className={classNames(
                              'inline-flex items-center border-b-2',
                              pathname.startsWith(item.href)
                                ? 'border-indigo-500 text-gray-900 dark:text-white'
                                : 'border-transparent text-gray-500 dark:text-gray-300 hover:border-gray-300 hover:text-gray-700 dark:hover:text-white',
                              'px-1 py-2 text-sm font-medium cursor-pointer transition-colors'
                            )}
                          >
                            {item.name}
                          </Menu.Button>
                          <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                          >
                            <Menu.Items className="absolute left-0 top-full z-50 mt-1 w-48 origin-top-left rounded-md bg-white dark:bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                              {item.children.map((child) => (
                                (!child.requireManagerOrAbove || isManagerOrAbove) && (
                                  <Menu.Item key={child.name}>
                                    {({ active }) => (
                                      <Link
                                        href={child.href}
                                        className={classNames(
                                          active ? 'bg-gray-100 dark:bg-gray-700' : '',
                                          'block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 transition-colors'
                                        )}
                                      >
                                        {child.name}
                                      </Link>
                                    )}
                                  </Menu.Item>
                                )
                              ))}
                              {item.name === '服務紀錄' && isHR && (
                                <Menu.Item key="所有收支明細">
                                  {({ active }) => (
                                    <Link
                                      href="/services/all-expenses"
                                      className={classNames(
                                        active ? 'bg-gray-100 dark:bg-gray-700' : '',
                                        'block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 transition-colors'
                                      )}
                                    >
                                      所有收支明細
                                    </Link>
                                  )}
                                </Menu.Item>
                              )}
                            </Menu.Items>
                          </Transition>
                        </Menu>
                      ) : (
                        <Link
                          href={item.href}
                          className={classNames(
                            'inline-flex items-center border-b-2',
                            pathname === item.href
                              ? 'border-indigo-500 text-gray-900 dark:text-white'
                              : 'border-transparent text-gray-500 dark:text-gray-300 hover:border-gray-300 hover:text-gray-700 dark:hover:text-white',
                            'px-1 py-2 text-sm font-medium transition-colors'
                          )}
                        >
                          {item.name}
                        </Link>
                      )}
                    </Fragment>
                  ))}
                  {isAdmin && adminNavigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={classNames(
                        'inline-flex items-center border-b-2',
                        pathname === item.href
                          ? 'border-indigo-500 text-gray-900 dark:text-white'
                          : 'border-transparent text-gray-500 dark:text-gray-300 hover:border-gray-300 hover:text-gray-700 dark:hover:text-white',
                        'px-1 py-2 text-sm font-medium transition-colors'
                      )}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:items-center">
                {user ? (
                  <Menu as="div" className="relative ml-3">
                    <div>
                      <Menu.Button className="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-gray-800">
                        <span className="sr-only">開啟使用者選單</span>
                        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <span className="text-gray-600 dark:text-gray-200">{user.name[0]}</span>
                        </div>
                      </Menu.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-200"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              href="/profile"
                              className={classNames(
                                active ? 'bg-gray-100 dark:bg-gray-700' : '',
                                'block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 transition-colors'
                              )}
                            >
                              個人資料設定
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={handleLogout}
                              className={classNames(
                                active ? 'bg-gray-100 dark:bg-gray-700' : '',
                                'block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 transition-colors'
                              )}
                            >
                              登出
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                ) : (
                  <Link
                    href="/login"
                    className="text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white transition-colors"
                  >
                    登入
                  </Link>
                )}
              </div>
              <div className="-mr-2 flex items-center sm:hidden">
                <Disclosure.Button className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 dark:hover:bg-gray-700 dark:hover:text-white transition-colors">
                  <span className="sr-only">開啟主選單</span>
                  {open ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          <Disclosure.Panel className="sm:hidden">
            <div className="space-y-1 pb-3 pt-2">
              {navigation.map((item) => (
                <Fragment key={item.name}>
                  {item.children ? (
                    <>
                      <Disclosure.Button
                        as="div"
                        className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium text-gray-500 dark:text-gray-300 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-white transition-colors"
                      >
                        {item.name}
                      </Disclosure.Button>
                      <div className="ml-4">
                        {item.children.map((child) => (
                          <Link
                            key={child.name}
                            href={child.href}
                            className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium text-gray-500 dark:text-gray-300 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-white transition-colors"
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      className={classNames(
                        'block border-l-4 py-2 pl-3 pr-4 text-base font-medium',
                        pathname === item.href
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-gray-700 dark:text-white'
                          : 'border-transparent text-gray-500 dark:text-gray-300 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-white transition-colors'
                      )}
                    >
                      {item.name}
                    </Link>
                  )}
                </Fragment>
              ))}
              {isAdmin && adminNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={classNames(
                    'block border-l-4 py-2 pl-3 pr-4 text-base font-medium',
                    pathname === item.href
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-gray-700 dark:text-white'
                      : 'border-transparent text-gray-500 dark:text-gray-300 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-white transition-colors'
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>
            <div className="border-t border-gray-200 pb-3 pt-4 dark:border-gray-700">
              {user ? (
                <>
                  <div className="flex items-center px-4">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <span className="text-gray-600 dark:text-gray-200">{user.name[0]}</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="text-base font-medium text-gray-800 dark:text-white">
                        {user.name}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-base font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white transition-colors"
                    >
                      個人資料
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white transition-colors"
                    >
                      登出
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-3 space-y-1">
                  <Link
                    href="/login"
                    className="block px-4 py-2 text-base font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white transition-colors"
                  >
                    登入
                  </Link>
                </div>
              )}
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
} 