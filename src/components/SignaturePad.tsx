'use client';

import SignatureCanvas from 'react-signature-canvas';
import { useRef, useState } from 'react';
import { SignatureData } from '@/types/service';

interface SignaturePadProps {
  onSave: (data: SignatureData) => void;
  onCancel: () => void;
  title?: string;
}

export default function SignaturePad({
  onSave,
  onCancel,
  title = '簽名'
}: SignaturePadProps) {
  const sigRef = useRef<SignatureCanvas>(null);

  const handleSave = () => {
    const canvas = sigRef.current;
    if (canvas && !canvas.isEmpty()) {
      const data: SignatureData = {
        strokes: canvas.toData(),
        dataUrl: canvas.toDataURL()
      };
      onSave(data);
    } else {
      alert("請簽名後再儲存");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-bold">{title}</h2>
        <button 
          onClick={onCancel} 
          className="text-red-600 text-sm px-4 py-2 hover:bg-red-50 rounded"
        >
          關閉
        </button>
      </div>

      <div className="flex-1 bg-gray-50">
        <SignatureCanvas
          ref={sigRef}
          penColor="black"
          canvasProps={{
            className: 'w-full h-full touch-none bg-white'
          }}
        />
      </div>

      <div className="flex justify-between p-4 border-t bg-white">
        <button 
          onClick={() => sigRef.current?.clear()} 
          className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition-colors"
        >
          清除
        </button>
        <button 
          onClick={handleSave} 
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          儲存簽名
        </button>
      </div>
    </div>
  );
}

// 簽名欄位元件
export function SignatureField({
  label,
  value,
  onChange,
  disabled = false
}: {
  label: string;
  value?: SignatureData;
  onChange: (data: SignatureData | undefined) => void;
  disabled?: boolean;
}) {
  const [showPad, setShowPad] = useState(false);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      
      <div className="flex items-center space-x-4">
        <button
          type="button"
          onClick={() => !disabled && setShowPad(true)}
          disabled={disabled}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            disabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {value ? '重新簽名' : '開啟簽名板'}
        </button>

        {value && (
          <>
            <button
              type="button"
              onClick={() => !disabled && onChange(undefined)}
              disabled={disabled}
              className={`text-sm ${
                disabled
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-red-600 hover:text-red-700'
              }`}
            >
              清除簽名
            </button>
            <span className="text-green-600 text-sm">
              ✓ 已簽名
            </span>
          </>
        )}
      </div>

      {value?.dataUrl && (
        <div className="mt-2">
          <img
            src={value.dataUrl}
            alt="簽名"
            className="max-h-24 border rounded-md"
          />
        </div>
      )}

      {showPad && (
        <SignaturePad
          title={`${label}簽名`}
          onSave={(data) => {
            onChange(data);
            setShowPad(false);
          }}
          onCancel={() => setShowPad(false)}
        />
      )}
    </div>
  );
} 