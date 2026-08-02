export const DATA_GO_KR_SERVICE_KEY_ENV = "DATA_GO_KR_SERVICE_KEY";

export function getDataGoKrServiceKey() {
  return process.env[DATA_GO_KR_SERVICE_KEY_ENV]?.trim() ?? "";
}

export function requireDataGoKrServiceKey() {
  const serviceKey = getDataGoKrServiceKey();

  if (!serviceKey) {
    throw new Error(
      `${DATA_GO_KR_SERVICE_KEY_ENV} is not set. Run npm run key:save or set the environment variable.`
    );
  }

  return serviceKey;
}

export function createDataGoKrUrl(endpoint, params = {}) {
  const url = new URL(endpoint);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const serviceKey = requireDataGoKrServiceKey();
  const separator = url.search ? "&" : "?";

  return `${url.toString()}${separator}serviceKey=${serviceKey}`;
}

export async function fetchDataGoKrJson(endpoint, params = {}, options = {}) {
  const response = await fetch(createDataGoKrUrl(endpoint, params), options);

  if (!response.ok) {
    throw new Error(`Data.go.kr request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
