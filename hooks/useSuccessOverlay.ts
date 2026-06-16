// hooks/useSuccessOverlay.ts
import { useState, useCallback } from 'react';

interface OverlayConfig {
  message?: string;
  subMessage?: string;
  duration?: number;
}

export const useSuccessOverlay = () => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<OverlayConfig>({});

  const showSuccess = useCallback((cfg: OverlayConfig = {}) => {
    setConfig(cfg);
    setVisible(true);
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  return { visible, config, showSuccess, dismiss };
};