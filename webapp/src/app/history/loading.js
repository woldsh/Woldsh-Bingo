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
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '18px',
        background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.2), rgba(20, 184, 166, 0.05))',
        border: '1px solid rgba(20, 184, 166, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '26px',
        animation: 'loadPulse 1.5s ease-in-out infinite',
      }}>
        🕒
      </div>
      <div style={{
        width: '36px',
        height: '36px',
        border: '3px solid rgba(20, 184, 166, 0.15)',
        borderTopColor: '#14b8a6',
        borderRadius: '50%',
        animation: 'loadSpin 0.8s linear infinite',
      }} />
      <style>{`
        @keyframes loadSpin { to { transform: rotate(360deg); } }
        @keyframes loadPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(0.92); opacity: 0.7; } }
      `}</style>
    </div>
  );
}
