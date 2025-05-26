import { NextResponse } from 'next/server';

const GAS_URL = "https://script.google.com/macros/s/AKfycbzUtko8xXh5zLkfIYgd_-7-P9PfnRtUtebBfhWFG4opjgzmIOaL740dnyZMsiW9vJLf-w/exec";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 加入必要的參數
    const requestBody = {
      ...body,
      folderPath: '19lbFYAqz8VvkryxsHuZfnB53xJyknw84', // 指定的資料夾 ID
      accessType: 'anyone', // 設定為任何人都可以存取
      role: 'reader' // 設定為只能讀取
    };

    console.log("🔄 轉發請求到 GAS...");
    const gasResponse = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log("🔁 GAS 回應狀態：", gasResponse.status, gasResponse.statusText);
    const result = await gasResponse.json();
    
    if (!result.success) {
      console.error("❌ GAS 回應失敗：", result.error);
      return NextResponse.json(
        { error: result.error || '上傳失敗' },
        { status: 400 }
      );
    }

    // 修改回傳的 URL 格式
    const fileId = result.fileUrl.match(/\/d\/(.+?)\/view/)?.[1];
    const directUrl = fileId ? `https://drive.google.com/uc?export=view&id=${fileId}` : result.fileUrl;

    console.log("✅ GAS 上傳成功");
    return NextResponse.json({
      ...result,
      fileUrl: directUrl
    });
    
  } catch (error) {
    console.error("❌ API 處理錯誤：", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 