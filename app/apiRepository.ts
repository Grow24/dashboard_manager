const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost/api/v1';

export function getAuthToken(): string {
  return localStorage.getItem('auth_token') || '';
}

export function toQueryString(obj: Record<string, any>): string {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(`${key}[]`, String(v)));
      } else {
        params.append(key, String(value));
      }
    }
  });
  return params.toString();
}

export async function apiCall<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  bodyOrParams?: any
): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Authorization': `Bearer ${token}`,
  };

  let fullUrl = `${API_BASE_URL}${url}`;
  let body: string | undefined;

  if (method === 'GET' && bodyOrParams) {
    const queryString = toQueryString(bodyOrParams);
    if (queryString) {
      fullUrl += `?${queryString}`;
    }
  } else if (bodyOrParams) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(bodyOrParams);
  }

  const response = await fetch(fullUrl, {
    method,
    headers,
    body,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}