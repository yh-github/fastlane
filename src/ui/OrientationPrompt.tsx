import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useIsLandscape,
  canLockOrientation,
  requestFullscreenAndLockLandscape,
} from '../hooks/useScreenOrientation';

export interface OrientationPromptProps {
  forceVisible?: boolean;
  onDismiss?: () => void;
}

export const OrientationPrompt: React.FC<OrientationPromptProps> = ({
  forceVisible = false,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const isLandscape = useIsLandscape();
  const [dismissed, setDismissed] = useState(false);
  const [canLock, setCanLock] = useState(false);
  const [attemptedLock, setAttemptedLock] = useState(false);

  useEffect(() => {
    setCanLock(canLockOrientation());
  }, []);

  const handleForceLandscape = async () => {
    setAttemptedLock(true);
    await requestFullscreenAndLockLandscape();
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  // If landscape or dismissed (unless forced for testing/storybook), do not render
  if ((isLandscape || dismissed) && !forceVisible) {
    return null;
  }

  return (
    <div
      className="orientation-prompt-overlay"
      data-testid="orientation-prompt"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="orientation-title"
      aria-describedby="orientation-message"
    >
      <div className="orientation-prompt-card">
        <div className="orientation-prompt-icon-container" aria-hidden="true">
          <div className="orientation-prompt-phone">
            <div className="orientation-prompt-phone-notch" />
            <div className="orientation-prompt-phone-screen">
              <span className="orientation-prompt-arrow">↺</span>
            </div>
          </div>
        </div>

        <h2 id="orientation-title" className="orientation-prompt-title">
          {t('orientation.title', { defaultValue: 'Please Rotate Your Device' })}
        </h2>

        <p id="orientation-message" className="orientation-prompt-message">
          {t('orientation.message', {
            defaultValue:
              'Fast Lane Modernized is designed for landscape mode. Please turn your phone sideways to play.',
          })}
        </p>

        <p className="orientation-prompt-tip">
          {t('orientation.autoRotateTip', {
            defaultValue:
              'If your screen doesn’t rotate, check that Auto-Rotate is enabled in your device settings.',
          })}
        </p>

        <div className="orientation-prompt-actions">
          {canLock && (
            <button
              type="button"
              className="orientation-prompt-btn-rotate"
              data-testid="orientation-btn-rotate"
              onClick={handleForceLandscape}
            >
              🔄 {t('orientation.rotateBtn', { defaultValue: 'Switch to Landscape' })}
            </button>
          )}

          {attemptedLock && (
            <p className="orientation-prompt-attempt-hint" data-testid="orientation-attempt-hint">
              {t('orientation.autoRotateTip', {
                defaultValue:
                  'If your screen doesn’t rotate, check that Auto-Rotate is enabled in your device settings.',
              })}
            </p>
          )}

          <button
            type="button"
            className="orientation-prompt-btn-dismiss"
            data-testid="orientation-btn-dismiss"
            onClick={handleDismiss}
          >
            {t('orientation.continueAnyway', { defaultValue: 'Continue in portrait anyway' })}
          </button>
        </div>
      </div>
    </div>
  );
};
