import { NextResponse } from 'next/server';
import { drive, folderId } from '@/lib/google';
import { Readable } from 'stream';

const ROOT_FOLDER_NAME = '사고보고';
const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

// Shared Drive 호환 공통 옵션
const DRIVE_OPTS = { 
  supportsAllDrives: true,
  includeItemsFromAllDrives: true,
};

// driveUrl에서 폴더 ID 추출 (25자 이상의 식별자 패턴 찾기)
function extractFolderId(url) {
  if (!url) return null;
  // 구글 드라이브 ID는 보통 28~33자이며 영문, 숫자, 언더바(_), 하이픈(-)으로 구성됨
  const match = url.match(/([a-zA-Z0-9_-]{25,})/);
  return match ? match[1] : null;
}

// ── 파일 목록 조회 (앱 스크립트 우선 조회 방식으로 전환) ──
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const driveUrl = searchParams.get('driveUrl');
    const folderName = searchParams.get('folderName');
    const extractedId = extractFolderId(driveUrl);
    
    let files = [];

    // [1단계] 앱 스크립트 프록시 조회 (사용자 권한이므로 가장 확실)
    if (SCRIPT_URL && (extractedId || driveUrl)) {
      try {
        // 앱 스크립트가 어떤 명령어를 기다릴지 모르므로 가능한 모든 조합을 다 보냅니다.
        const getUrl = `${SCRIPT_URL}?action=list&method=list&cmd=list&type=list&folderId=${extractedId || ''}&driveUrl=${encodeURIComponent(driveUrl || '')}&url=${encodeURIComponent(driveUrl || '')}`;
        const proxyRes = await fetch(getUrl);
        if (proxyRes.ok) {
          const data = await proxyRes.json();
          // 데이터가 어디에 들어있든 다 찾아냄
          files = Array.isArray(data) ? data : (data.files || data.data || data.list || data.fileList || data.items || []);
        }
      } catch (e) {
        console.warn('Apps Script list failed, falling back to direct:', e.message);
      }
    }

    // [2단계] 앱 스크립트에서 결과가 없으면 서비스 계정 직접 조회 (백업)
    if (files.length === 0 && (extractedId || folderName)) {
      try {
        let targetId = extractedId;
        // ID 기반 조회
        if (targetId) {
          try {
            const meta = await drive.files.get({ fileId: targetId, fields: 'parents, mimeType', ...DRIVE_OPTS });
            if (meta.data.mimeType !== 'application/vnd.google-apps.folder' && meta.data.parents) {
              targetId = meta.data.parents[0];
            }
          } catch (e) {}

          const res = await drive.files.list({
            q: `'${targetId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
            fields: 'files(id, name, mimeType, size, webViewLink)',
            orderBy: 'createdTime',
            ...DRIVE_OPTS,
          });
          files = res.data.files || [];
        }

        // 여전히 없으면 사고번호로 폴더 검색
        if (files.length === 0 && folderName) {
          const accidentNo = folderName.split('_')[0];
          const searchRes = await drive.files.list({
            q: `name contains '${accidentNo}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
            ...DRIVE_OPTS
          });
          const folders = searchRes.data.files || [];
          if (folders.length > 0) {
            const listRes = await drive.files.list({
              q: `'${folders[0].id}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
              fields: 'files(id, name, mimeType, size, webViewLink)',
              orderBy: 'createdTime',
              ...DRIVE_OPTS
            });
            files = listRes.data.files || [];
          }
        }
      } catch (e) {
        console.error('Direct backup list failed:', e.message);
      }
    }

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Listing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── 파일 업로드 (앱 스크립트 경유하여 용량 및 권한 해결) ──
export async function POST(request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files');
    const folderName = formData.get('folderName'); // 예: "사고번호_사고명"

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (!SCRIPT_URL) throw new Error('GOOGLE_SCRIPT_URL missing');

    let lastDriveUrl = '';
    const uploadResults = [];

    // 파일을 하나씩 순차적으로 앱 스크립트에 전송 (스크립트 호환성 극대화)
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');

      const payload = {
        action: 'upload',
        folderName: `${ROOT_FOLDER_NAME}/${folderName}`,
        // 호환성을 위해 가능한 모든 필드명 제공
        fileName: file.name,
        filename: file.name,
        mimeType: file.type,
        mimetype: file.type,
        base64: base64,
        data: base64,
        parentFolderId: folderId
      };

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Upload failed');
      
      // 폴더 주소 확보 (우선순위: folderUrl > driveUrl > url)
      lastDriveUrl = result.folderUrl || result.driveUrl || result.url || lastDriveUrl;
      uploadResults.push(result);
    }

    // 폴더에 "링크가 있는 모든 사용자에게 뷰어 권한" 부여 (다른 사람이 승인 요청 없이 즉시 열람하도록 함)
    if (lastDriveUrl) {
      const folderId = extractFolderId(lastDriveUrl);
      if (folderId) {
        try {
          await drive.permissions.create({
            fileId: folderId,
            requestBody: {
              role: 'reader',
              type: 'anyone',
            },
            supportsAllDrives: true,
          });
          console.log(`Permission successfully set to 'anyone' (reader) for folder: ${folderId}`);
        } catch (permissionError) {
          console.error('Failed to set public folder permission:', permissionError.message);
          // 권한 설정 과정의 실패가 업로드 자체의 실패로 이어지지 않도록 예외는 기록만 하고 통과합니다.
        }
      }
    }

    return NextResponse.json({
      success: true,
      driveUrl: lastDriveUrl,
      files: uploadResults
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── 파일 삭제 (앱 스크립트 우선 삭제 방식으로 전환) ──
export async function DELETE(request) {
  try {
    const { fileId } = await request.json();
    if (!fileId) return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });

    // [1단계] 앱 스크립트 프록시를 통해 삭제 시도 (사용자 권한 활용 - 가장 확실)
    if (SCRIPT_URL) {
      try {
        const proxyRes = await fetch(SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'delete', fileId }),
        });
        const result = await proxyRes.json();
        if (result.success) return NextResponse.json({ success: true });
      } catch (e) {
        console.warn('Apps Script delete failed, falling back to direct:', e.message);
      }
    }

    // [2단계] 앱 스크립트 실패 시 서비스 계정 직접 삭제 시도 (백업)
    await drive.files.delete({ 
      fileId, 
      ...DRIVE_OPTS 
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
