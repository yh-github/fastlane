import { createPortal } from 'react-dom';

export function ActionReasonModal({ title = "Action Unavailable", reason, onClose }: { title?: string, reason: string, onClose: () => void }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--panel-bg, #13132c)', backdropFilter: 'blur(15px)', color: '#fff', padding: '24px', border: '1px solid #e74c3c', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.8), 0 0 10px rgba(231,76,60,0.5)', zIndex: 10000, maxWidth: '400px', width: '90%', textAlign: 'center' }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#e74c3c' }}>⚠️ {title}</h4>
      <p style={{ whiteSpace: 'pre-wrap', marginBottom: '20px', fontSize: '13px', lineHeight: '1.5', color: '#e0e0ff' }}>
        {reason}
      </p>
      <button 
        onClick={onClose}
        style={{ padding: '8px 24px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
      >
        OK
      </button>
    </div>,
    document.body
  );
}
