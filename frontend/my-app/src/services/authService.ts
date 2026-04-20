export interface UserInfo {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

/**
 * Get current user info from token
 * Parses JWT token stored in localStorage
 */
export function getCurrentUser(): UserInfo | null {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return null;
  }
  
  try {
    // Parse JWT token (format: header.payload.signature)
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    
    return {
      userId: decoded.sub || decoded.user_id || '',
      tenantId: decoded.tenant_id || '',
      email: decoded.email || '',
      role: decoded.role || 'User'
    };
  } catch (error) {
    console.error('Failed to parse token:', error);
    return null;
  }
}

/**
 * Get tenant ID from current user
 */
export function getTenantId(): string | null {
  const user = getCurrentUser();
  return user?.tenantId || null;
}
