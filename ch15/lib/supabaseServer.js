export const SUPABASE_URL_ENV = "SUPABASE_URL";
export const SUPABASE_ANON_KEY_ENV = "SUPABASE_ANON_KEY";

function getSupabaseConfig() {
  const url = process.env[SUPABASE_URL_ENV]?.trim();
  const anonKey = process.env[SUPABASE_ANON_KEY_ENV]?.trim();

  if (!url || !anonKey) {
    throw new Error(`${SUPABASE_URL_ENV} and ${SUPABASE_ANON_KEY_ENV} must be set.`);
  }

  return {
    url: url.replace(/\/+$/, ""),
    anonKey,
  };
}

function appendSearchParams(url, searchParams) {
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });
}

export async function supabaseRest(
  table,
  { method = "GET", searchParams = {}, headers = {}, body } = {}
) {
  const { url, anonKey } = getSupabaseConfig();
  const requestUrl = new URL(`/rest/v1/${table}`, url);
  const hasBody = body !== undefined;

  appendSearchParams(requestUrl, searchParams);

  const response = await fetch(requestUrl, {
    method,
    cache: "no-store",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: hasBody ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase ${method} ${table} failed: ${response.status} ${text}`);
  }

  if (response.status === 204) return null;

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function supabaseRestPages(
  table,
  { searchParams = {}, headers = {}, pageSize = 1000 } = {}
) {
  const rows = [];

  for (let start = 0; ; start += pageSize) {
    const pageRows = await supabaseRest(table, {
      searchParams,
      headers: {
        Range: `${start}-${start + pageSize - 1}`,
        ...headers,
      },
    });

    if (!Array.isArray(pageRows)) {
      throw new Error(`Supabase ${table} did not return a row array.`);
    }

    rows.push(...pageRows);

    if (pageRows.length < pageSize) break;
  }

  return rows;
}
