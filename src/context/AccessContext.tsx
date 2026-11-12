import React, { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';
import { VipUpgradeModal } from '../components/VipUpgradeModal';

interface AccessContextType {
  // Đã đăng nhập: trả về true. Khách: chuyển tới Log In rồi quay lại, trả về false
  ensureMember: () => boolean;
  // Có gói hội viên: trả về true. Khách: chuyển tới Log In. Thành viên thường: mời nâng cấp
  ensureVip: (feature: string) => boolean;
}

const AccessContext = createContext<AccessContextType | undefined>(undefined);

interface AccessProviderProps {
  children: React.ReactNode;
  onRequireLogin: () => void;
  onOpenPlans: () => void;
}

// Gom quy tắc phân quyền Khách / Thành viên thường / VIP vào một chỗ cho mọi màn hình dùng chung
export const AccessProvider: React.FC<AccessProviderProps> = ({ children, onRequireLogin, onOpenPlans }) => {
  const { currentUser, isVip } = useAuth();
  const [lockedFeature, setLockedFeature] = useState<string | null>(null);

  const ensureMember = () => {
    if (currentUser) return true;
    onRequireLogin();
    return false;
  };

  const ensureVip = (feature: string) => {
    if (!ensureMember()) return false;
    if (isVip) return true;
    setLockedFeature(feature);
    return false;
  };

  return (
    <AccessContext.Provider value={{ ensureMember, ensureVip }}>
      {children}
      <VipUpgradeModal
        feature={lockedFeature}
        onClose={() => setLockedFeature(null)}
        onViewPlans={() => {
          setLockedFeature(null);
          onOpenPlans();
        }}
      />
    </AccessContext.Provider>
  );
};

export const useAccess = () => {
  const context = useContext(AccessContext);
  if (!context) {
    throw new Error('useAccess phải nằm trong AccessProvider');
  }
  return context;
};
