import "server-only";

export function getDataGoKrServiceKey() {
  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY?.trim();

  if (!serviceKey) {
    throw new Error(".env에 DATA_GO_KR_SERVICE_KEY를 설정해 주세요.");
  }

  return serviceKey;
}

export async function requestDataGoKr(path, params = {}) {
  let key = getDataGoKrServiceKey();
  try { key = decodeURIComponent(key); } catch { /* 디코딩 키도 허용 */ }
  const url = new URL(`https://apis.data.go.kr/1160100/service/${path}`);
  url.search = new URLSearchParams({ ...params, serviceKey: key, resultType: 'json', pageNo: params.pageNo || '1' });
  const response = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('공공데이터 API HTTP 오류');
  const data = await response.json();
  if (data.response?.header?.resultCode !== '00' || !data.response.body) {
    throw new Error('공공데이터 API 응답 오류');
  }
  return data.response.body;
}
