'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import BottomNav from '@/components/BottomNav';
import { expandWebApp, hapticFeedback, getTelegramWebApp } from '@/lib/telegram';



export default function HomePage() {
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [showRules, setShowRules] = useState(false);
  const [loading, setLoading] = useState(true);
  const [needsPhone, setNeedsPhone] = useState(false);
  const [isGlobalMaintenance, setIsGlobalMaintenance] = useState(false);
  const [globalNotice, setGlobalNotice] = useState('');

  useEffect(() => {
    expandWebApp();
    fetchRooms();
    checkAuth();

    // Listen for room updates from admin
    const { socket } = require('@/lib/socket');
    socket.on('rooms_updated', () => {
      console.log('Rooms updated by admin, refetching...');
      fetchRooms();
    });

    // Refresh rooms periodically to show live Derash
    const refreshInterval = setInterval(fetchRooms, 10000);

    return () => {
      socket.off('rooms_updated');
      clearInterval(refreshInterval);
    };
  }, []);

  async function checkAuth() {
    try {
      const { userApi } = await import('@/lib/api');
      const data = await userApi.me();
      if (!data.user.phone) {
        setNeedsPhone(true);
      }
    } catch {
      // Ignore in demo mode
    }
  }

  function handleRequestContact() {
    const webapp = getTelegramWebApp();
    if (webapp && webapp.requestContact) {
      webapp.requestContact((shared) => {
        if (shared) {
          setNeedsPhone(false);
          hapticFeedback('medium');
        }
      });
    }
  }

  async function fetchRooms() {
    try {
      const { gamesApi } = await import('@/lib/api');
      // Add timestamp to bypass mobile caching
      const data = await gamesApi.list(`?t=${Date.now()}`);
      if (data.rooms) setRooms(data.rooms);
      setGlobalNotice(data.globalNotice || '');
      // Use loose truthy check for robust boolean handling from different DBs
      if (data.globalMaintenance !== undefined) setIsGlobalMaintenance(!!data.globalMaintenance);
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }

  function handlePlay(room) {
    if (room.isMaintenance) return;
    hapticFeedback('medium');
    router.push(`/game/${room.id}`);
  }

  if (loading) {
    return (
      <div className="page-container obsidian-theme" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (isGlobalMaintenance) {
    return (
      <div className="page-container obsidian-theme" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px',
        textAlign: 'center',
        minHeight: '100vh',
        background: '#020617'
      }}>
        <div style={{
          width: '100px',
          height: '100px',
          background: 'rgba(239, 68, 68, 0.2)',
          borderRadius: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '30px',
          border: '2px solid #ef4444',
          boxShadow: '0 0 30px rgba(239, 68, 68, 0.3)'
        }}>
          <span style={{ fontSize: '50px' }} className="maintenance-vibrate">🛠️</span>
        </div>
        <h1 className="maintenance-vibrate" style={{
          fontSize: '32px',
          fontWeight: '900',
          color: '#ef4444',
          marginBottom: '16px',
          letterSpacing: '1px'
        }}>
          SYSTEM MAINTENANCE
        </h1>
        <p style={{ color: '#94a3b8', lineHeight: 1.6, maxWidth: '280px', margin: '0 auto 30px', fontWeight: '500' }}>
          We are upgrading our systems to serve you better. We'll be back online shortly!
        </p>
        <div style={{
          padding: '16px 32px',
          background: '#ef4444',
          borderRadius: '16px',
          border: '2px solid #fff',
          color: '#fff',
          fontSize: '18px',
          fontWeight: '900',
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)'
        }}>
          MAINTENANCE MODE
        </div>

        {/* Notice Bar inside Maintenance Screen */}
        {globalNotice && (
          <div className="maintenance-vibrate" style={{
            marginTop: '24px',
            padding: '14px 24px',
            background: 'rgba(251, 191, 36, 0.15)',
            borderRadius: '16px',
            border: '2px solid #fbbf24',
            color: '#fbbf24',
            fontSize: '16px',
            fontWeight: '800',
            maxWidth: '320px',
            boxShadow: '0 0 20px rgba(251, 191, 36, 0.3)',
            textAlign: 'center'
          }}>
            📢 {globalNotice}
          </div>
        )}

        <div style={{ marginTop: '40px', opacity: 0.5, fontSize: '12px', color: '#64748b' }}>
          &copy; 2026 Woldsh Bingo. All rights reserved.
        </div>
      </div>
    );
  }

  return (
    <div className="page-container obsidian-theme">
      {/* Original Simple Header */}
      <header className="header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="header-brand">
          <div className="header-logo" style={{
            width: 32, height: 32, borderRadius: 8, overflow: 'hidden', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Image src="/banner.png" alt="Logo" width={32} height={32} style={{ objectFit: 'cover' }} />
          </div>
          <span className="header-title" style={{ fontSize: '18px', fontWeight: '800' }}>WOLDSH BINGO</span>
        </div>
        <button className="header-btn" onClick={() => setShowRules(true)} style={{
          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)',
          border: '1px solid rgba(251, 191, 36, 0.4)',
          padding: '6px 20px',
          borderRadius: '20px',
          color: '#fbbf24',
          fontSize: '13px',
          fontWeight: '800',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          boxShadow: '0 0 15px rgba(251, 191, 36, 0.15)',
          transition: 'all 0.3s ease'
        }}>
          📜 Rules
        </button>
      </header>

      {/* Global Notice Bar */}
      {globalNotice && (
        <div style={{
          margin: '16px 16px 0',
          padding: '14px 18px',
          background: 'linear-gradient(135deg, #0f172a 0%, #020617 100%)',
          borderRadius: '16px',
          border: '2px solid #fbbf24',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 15px rgba(251, 191, 36, 0.1)'
        }}>
          <div style={{
            fontSize: '22px',
            background: 'rgba(251, 191, 36, 0.15)',
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '1px solid rgba(251, 191, 36, 0.3)'
          }}>
            🔔
          </div>
          <div style={{ color: '#fbbf24', fontSize: '15px', fontWeight: '800', lineHeight: 1.4, letterSpacing: '0.3px' }}>
            {globalNotice}
          </div>
        </div>
      )}

      {/* Stake Selection */}
      <div className="stake-cards" style={{ padding: '20px 16px' }}>
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={`skeleton-${i}`} className="stake-card gold-bezel" style={{ height: '140px', background: '#1e3a8a', opacity: 0.5, marginBottom: '20px' }}></div>
          ))
        ) : rooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎰</div>
            <h3 style={{ color: '#fff' }}>No Active Rooms</h3>
          </div>
        ) : (
          rooms.map((room, index) => {
            // Determine theme color based on status - use loose truthy check for robust boolean handling
            const isMaintenance = !!room.isMaintenance;
            const themeClass = isMaintenance ? 'silver' : (room.stake >= 100 ? 'navy' : room.stake >= 30 ? 'red' : 'blue');
            const bgGradient = isMaintenance ? 'linear-gradient(135deg, #020617 0%, #0f172a 100%)' : `var(--metallic-${themeClass})`;

            return (
              <div
                key={room.id || index}
                className="stake-card gold-bezel"
                style={{
                  background: bgGradient,
                  padding: '10px 16px',
                  borderRadius: '12px',
                  marginBottom: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  position: 'relative',
                  overflow: 'hidden',
                  border: isMaintenance ? '2px solid #ef4444' : undefined,
                  opacity: 1,
                  pointerEvents: isMaintenance ? 'none' : 'auto'
                }}
              >
                {/* Achievement/Rank Emoji or Lock */}
                <div style={{ position: 'absolute', top: 10, left: 12, fontSize: '18px', zIndex: 2 }}>
                  {isMaintenance ? '⚠️' : (room.stake >= 100 ? '🏆' : room.stake >= 50 ? '👑' : '⭐')}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="stake-info" style={{ paddingLeft: '24px' }}>
                    <div className="text-metallic-gold" style={{
                      fontSize: '28px',
                      fontWeight: '900',
                      lineHeight: 1,
                      filter: isMaintenance ? 'grayscale(0.5) opacity(0.8)' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                    }}>
                      {room.stake} ETB
                    </div>
                    <div className={isMaintenance ? "maintenance-vibrate" : ""} style={{
                      fontSize: '14px',
                      fontWeight: '900',
                      color: isMaintenance ? '#ef4444' : '#cbd5e1',
                      marginTop: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}>
                      {isMaintenance ? 'UNDER MAINTENANCE' : room.roomName}
                    </div>
                  </div>

                  <div className="stake-actions" style={{ display: 'flex', gap: '6px' }}>
                    {!isMaintenance && (
                      <div className="btn-metallic btn-metallic-silver" style={{ padding: '4px 8px', fontSize: '10px', gap: '4px' }}>
                        🕒 WAIT
                      </div>
                    )}
                    <button
                      className={isMaintenance ? "btn-metallic maintenance-vibrate" : "btn-metallic btn-metallic-green"}
                      style={{
                        padding: '8px 20px',
                        fontSize: '12px',
                        background: isMaintenance ? '#ef4444' : undefined,
                        color: isMaintenance ? '#fff' : '#fff',
                        border: isMaintenance ? '2px solid #fff' : undefined,
                        fontWeight: '900',
                        boxShadow: isMaintenance ? '0 0 20px rgba(239, 68, 68, 0.4)' : undefined
                      }}
                      disabled={isMaintenance}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlay(room);
                      }}
                    >
                      {isMaintenance ? 'MAINTENANCE' : 'PLAY'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>
                    {room.playerCount} Players 👥
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '800', display: 'flex', gap: '4px' }}>
                    <span style={{ color: '#fff', opacity: 0.8 }}>Derash:</span>
                    <span style={{ color: '#fbbf24' }}>{room.derash || room.prize || 0} ETB</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Rules Modal */}
      {showRules && (
        <div className="modal-overlay" onClick={() => setShowRules(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title" style={{ fontSize: '24px', textAlign: 'center', marginBottom: '20px' }}>
              💎 The Path to Victory
            </div>
            <div className="rules-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Step By Step Card */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ color: '#fbbf24', fontWeight: '900', marginBottom: '10px', fontSize: '15px', textTransform: 'uppercase' }}>
                  🎮 Step-by-Step Entry
                </div>
                <div className="rule-item" style={{ marginBottom: '6px' }}>1. **Select Stake**: Choose your table and pick 1 or 2 cards.</div>
                <div className="rule-item" style={{ marginBottom: '6px' }}>2. **High Stakes**: Game begins after 30 seconds (min. 2 players).</div>
                <div className="rule-item" style={{ marginBottom: '6px' }}>3. **Live Draw**: Numbers emerge every 3 seconds — feel the tension!</div>
                <div className="rule-item">4. **Auto-Pilot**: Your cards are marked instantly by our high-performance server.</div>
              </div>

              {/* Winning Patterns Card */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ color: '#fbbf24', fontWeight: '900', marginBottom: '10px', fontSize: '15px', textTransform: 'uppercase' }}>
                  🏆 Winning Patterns
                </div>
                <div className="rule-item">1) **Corners**: 4 corners (Highest Priority) 🔲</div>
                <div className="rule-item">2) **Horizontal**: Full horizontal line ➡️</div>
                <div className="rule-item">3) **Vertical**: Full vertical line ⬇️</div>
                <div className="rule-item">4) **Diagonal**: Corner to corner ↗️</div>
              </div>

              {/* Prize Pool Card */}
              <div style={{ background: 'var(--gradient-card-1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.4)' }}>
                <div style={{ color: '#fbbf24', fontWeight: '900', marginBottom: '10px', fontSize: '15px', textTransform: 'uppercase' }}>
                  💰 Derash (The Royal Prize)
                </div>
                <div className="rule-item" style={{ fontSize: '13px', opacity: 0.9 }}>
                  The jackpot is calculated as: **Stake × Total Players × 80%**. The winner claims the throne and the entire pool!
                </div>
              </div>

              {/* Amharic Guide Card */}
              <div style={{ background: 'rgba(0,212,170,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,212,170,0.2)' }}>
                <div style={{ color: '#14b8a6', fontWeight: '900', marginBottom: '10px', fontSize: '15px' }}>
                  🇪🇹 አጭር መመሪያ (Quick Guide)
                </div>
                <div className="rule-item">1. ካርድዎን ይምረጡ - በ30 ሰከንድ ውስጥ ጨዋታ ይጀምራል።</div>
                <div className="rule-item">2. ቁጥሮች በራስ-ሰር ይወጣሉ - ምንም ድካም የለም።</div>
                <div className="rule-item">3. አሸናፊው ድራሹን (80%ውን) ሙሉ በሙሉ ይወስዳል!</div>
              </div>

            </div>
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <button className="btn-metallic btn-metallic-green" style={{ width: '100%', borderRadius: '12px', padding: '12px' }} onClick={() => setShowRules(false)}>
                I’m Ready to Win! 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      <footer style={{
        textAlign: 'center',
        padding: '20px 0',
        color: 'var(--text-muted)',
        fontSize: '12px',
        opacity: 0.6,
        letterSpacing: '1px'
      }}>
        @woldshbingo_bot
      </footer>

      <BottomNav />
    </div>
  );
}
