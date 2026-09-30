import React, { createContext, useContext, useState, useEffect } from 'react';

export const ROLES = {
  HOSPITAL_AUTHORITY: 'HOSPITAL_AUTHORITY',
  COLLECTION_OFFICER: 'COLLECTION_OFFICER',
  TRANSPORT_OFFICER: 'TRANSPORT_OFFICER',
  TREATMENT_FACILITY: 'TREATMENT_FACILITY',
  GOVERNMENT_AUTHORITY: 'GOVERNMENT_AUTHORITY',
  COMPLIANCE_INSPECTOR: 'COMPLIANCE_INSPECTOR'
};

export const ROLE_ROUTES = {
  HOSPITAL_AUTHORITY: '/hospital',
  COLLECTION_OFFICER: '/collection',
  TRANSPORT_OFFICER: '/transport',
  TREATMENT_FACILITY: '/treatment',
  GOVERNMENT_AUTHORITY: '/government',
  COMPLIANCE_INSPECTOR: '/inspector'
};

export const DEMO_ROLES_LIST = [
  {
    role: 'HOSPITAL_AUTHORITY',
    title: 'Hospital Authority',
    name: 'Dr. Aarav Mehta',
    email: 'hospital@demo.com',
    facility: 'AIIMS Central Hospital',
    badgeColor: 'bg-blue-50 text-blue-900 border-blue-200',
    accentColor: '#07559B',
    desc: 'Waste manifest registration & bed activity correlation'
  },
  {
    role: 'COLLECTION_OFFICER',
    title: 'Collection Officer',
    name: 'Meera Iyer',
    email: 'collection@demo.com',
    facility: 'EcoSafe Waste Handlers',
    badgeColor: 'bg-teal-50 text-teal-900 border-teal-200',
    accentColor: '#00C49E',
    desc: 'QR scan handover & bag barcode verification'
  },
  {
    role: 'TRANSPORT_OFFICER',
    title: 'Transport Officer',
    name: 'Vikram Singh',
    email: 'transport@demo.com',
    facility: 'BioTransit Fleet DL-01',
    badgeColor: 'bg-hazmat-100 text-hazmat-900 border-hazmat-300',
    accentColor: '#b45309',
    desc: 'Live GPS corridor tracking & route checkpoints'
  },
  {
    role: 'TREATMENT_FACILITY',
    title: 'Treatment Facility (CBWTF)',
    name: 'Rajesh Patel',
    email: 'treatment@demo.com',
    facility: 'Apex Bio-Clean (CBWTF)',
    badgeColor: 'bg-biohazard-100 text-biohazard-900 border-biohazard-300',
    accentColor: '#c2410c',
    desc: 'Weighbridge reconciliation, autoclave & disposal'
  },
  {
    role: 'GOVERNMENT_AUTHORITY',
    title: 'Government Authority',
    name: 'Sunita Sharma',
    email: 'regulator@demo.com',
    facility: 'CPCB Regulatory Board',
    badgeColor: 'bg-steel-100 text-steel-900 border-steel-300',
    accentColor: '#1e293b',
    desc: 'Jurisdiction-wide aggregate compliance oversight'
  },
  {
    role: 'COMPLIANCE_INSPECTOR',
    title: 'Compliance Inspector',
    name: 'Amit Deshmukh',
    email: 'inspector@demo.com',
    facility: 'National Audit Unit',
    badgeColor: 'bg-hazmat-100 text-steel-950 border-hazmat-400',
    accentColor: '#d97706',
    desc: 'Statutory anomaly risk cases & evidence investigation'
  }
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('biotrace_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('biotrace_token') || null;
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verify stored token on initial boot
  useEffect(() => {
    async function verifyAuth() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            localStorage.setItem('biotrace_user', JSON.stringify(data.user));
          }
        } else {
          // Token expired or invalid
          logout();
        }
      } catch (err) {
        console.warn('[AuthContext] Verification offline notice:', err.message);
      } finally {
        setLoading(false);
      }
    }

    verifyAuth();
  }, [token]);

  /**
   * Log in with email and password against backend API
   */
  async function login(email, password) {
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error('Authentication gateway temporarily unreachable. Please ensure the backend server is active.');
      }

      if (!res.ok) {
        const errMsg = data.message || data.error || 'Authentication failed';
        setError(errMsg);
        return { success: false, error: errMsg };
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('biotrace_token', data.token);
      localStorage.setItem('biotrace_user', JSON.stringify(data.user));

      return {
        success: true,
        role: data.user.role,
        user: data.user,
        dashboardRoute: ROLE_ROUTES[data.user.role] || '/hospital'
      };
    } catch (err) {
      const errMsg = err.message || 'Unable to connect to authentication server';
      setError(errMsg);
      return { success: false, error: errMsg };
    }
  }

  /**
   * 1-Click login helper for demo roles from login screen
   */
  async function loginAsDemoRole(roleOrEmail) {
    const demo = DEMO_ROLES_LIST.find(d => d.role === roleOrEmail || d.email === roleOrEmail) 
      || DEMO_ROLES_LIST[0];

    return login(demo.email, 'password123');
  }

  /**
   * Clears token and user context
   */
  function logout() {
    setToken(null);
    setUser(null);
    setError(null);
    localStorage.removeItem('biotrace_token');
    localStorage.removeItem('biotrace_user');
  }

  function getDashboardRoute(customRole) {
    const targetRole = customRole || user?.role;
    return ROLE_ROUTES[targetRole] || '/login';
  }

  function hasRole(...allowedRoles) {
    if (!user || !user.role) return false;
    return allowedRoles.flat().includes(user.role);
  }

  const value = {
    user,
    token,
    role: user?.role || null,
    isAuthenticated: !!token && !!user,
    loading,
    error,
    login,
    loginAsDemoRole,
    logout,
    getDashboardRoute,
    hasRole,
    demoRoles: DEMO_ROLES_LIST
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
