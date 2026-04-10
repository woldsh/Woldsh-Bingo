'use client';

export default function Loading() {
  return (
    <div className="obsidian-theme" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#050a12',
      gap: '20px',
    }}>
      {/* Pulsing Logo */}
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '32px',
        boxShadow: '0 0 40px rgba(245, 158, 11, 0.3)',
        animation: 'loadPulse 1.5s ease-in-out infinite',
      }}>
        🎮
      </div>

      {/* Spinner Ring */}
      <div style={{
        width: '36px',
        height: '36px',
        border: '3px solid rgba(20, 184, 166, 0.15)',
        borderTopColor: '#14b8a6',
        borderRadius: '50%',
        animation: 'loadSpin 0.8s linear infinite',
      }} />

      {/* Brand Text */}
      <div style={{
        fontSize: '13px',
        fontWeight: '700',
        letterSpacing: '2px',
        color: '#64748b',
        textTransform: 'uppercase',
      }}>
        WOLDSH BINGO
      </div>

      <style>{`
        @keyframes loadSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes loadPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.92); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
