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
      const data = await gamesApi.list();
      if (data.rooms) setRooms(data.rooms);
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

  return (
    <div className="page-container obsidian-theme">
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <div className="header-logo" style={{
            width: 32, height: 32, borderRadius: 8, overflow: 'hidden', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Image src="/banner.png" alt="Logo" width={32} height={32} style={{ objectFit: 'cover' }} />
          </div>
          <span className="header-title">WOLDSH BINGO</span>
        </div>
        <button className="header-btn" onClick={() => setShowRules(true)}>
          Rules
        </button>
      </header>

      {/* Registration Banner */}
      {needsPhone && (
        <div style={{
          margin: '20px',
          padding: '16px',
          background: 'var(--gradient-card-1)',
          borderRadius: '16px',
          border: '1px solid var(--accent-gold)',
          textAlign: 'center'
        }}>
          <h3 style={{ marginBottom: 8, color: 'var(--accent-gold)' }}>🎁 10 ETB Welcome Bonus</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Share your phone number to complete registration and claim your bonus!
          </p>
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={handleRequestContact}
          >
            📱 Verify Phone Number
          </button>
        </div>
      )}

      {/* Maintenance Banner */}
      {rooms.some(r => r.isMaintenance) && (
        <div style={{
          margin: '12px 20px',
          padding: '10px 16px',
          background: 'rgba(245, 158, 11, 0.12)',
          borderRadius: '12px',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          color: '#fbbf24',
        }}>
          <span style={{ fontSize: '16px' }}>🔧</span>
          <span>This room is temporarily stopped for maintenance.</span>
        </div>
      )}

      {/* Stake Selection */}
      <div style={{ padding: '24px 0 8px' }}>
        <h2 className="section-title">Choose Your Stake</h2>
      </div>

      <div className="stake-cards">
        {loading ? (
          /* Loading skeleton - shows while rooms are being fetched */
          [1, 2, 3].map((i) => (
            <div key={`skeleton-${i}`} className="stake-card stake-card-blue" style={{ opacity: 0.4, animation: 'pulse 1.5s ease-in-out infinite' }}>
              <div className="stake-info">
                <div style={{ width: '80px', height: '28px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}></div>
                <div style={{ width: '60px', height: '16px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', marginTop: '8px' }}></div>
                <div style={{ width: '120px', height: '14px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', marginTop: '8px' }}></div>
              </div>
              <div className="stake-actions">
                <div style={{ width: '70px', height: '26px', background: 'rgba(255,255,255,0.08)', borderRadius: '12px' }}></div>
                <div style={{ width: '60px', height: '36px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', marginTop: '8px' }}></div>
              </div>
            </div>
          ))
        ) : rooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎮</div>
            <div style={{ fontSize: '16px', fontWeight: '700' }}>No rooms available</div>
            <div style={{ fontSize: '13px', marginTop: '6px', color: '#64748b' }}>Please check back later</div>
          </div>
        ) : (
          rooms.map((room) => (
            <div
              key={room.id || `maintenance-${room.stake}`}
              className={`stake-card stake-card-${room.theme || 'blue'} ${room.isMaintenance ? 'stake-card-maintenance' : ''}`}
              onClick={() => handlePlay(room)}
              style={room.isMaintenance ? { opacity: 0.7, cursor: 'default' } : {}}
            >
              <div className="stake-info">
                <div className="stake-amount">{room.stake} ETB</div>
                <div className="stake-name">{room.roomName}</div>
                {!room.isMaintenance && (
                  <>
                    <div className="player-count">
                      {room.playerCount} player{room.playerCount !== 1 ? 's' : ''} joined
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: (room.derash || room.prize) > 0 ? '#10b981' : '#64748b',
                      marginTop: 4,
                      fontWeight: '800',
                      textShadow: (room.derash || room.prize) > 0 ? '0 0 10px rgba(16,185,129,0.3)' : 'none',
                      letterSpacing: '0.5px'
                    }}>
                      Derash: {room.derash || room.prize || 0} ETB
                    </div>
                  </>
                )}
              </div>
              <div className="stake-actions">
                {room.isMaintenance ? (
                  <span className="badge badge-maintenance">MAINTENANCE</span>
                ) : (
                  <span className={`badge ${room.status === 'waiting' ? 'badge-waiting' : 'badge-playing'}`}>
                    {room.status === 'waiting' ? 'WAITING' : 'PLAYING'}
                  </span>
                )}
                <button
                  className={`btn-play ${room.isMaintenance ? 'btn-play-disabled' : ''}`}
                  disabled={room.isMaintenance}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlay(room);
                  }}
                >
                  PLAY
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Rules Modal */}
      {showRules && (
        <div className="modal-overlay" onClick={() => setShowRules(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">📋 Game Rules</div>
            <div className="rules-list">
              <div style={{ marginBottom: '15px' }}>
                <div style={{ color: 'var(--accent-gold)', fontWeight: 'bold', marginBottom: '8px' }}>How to play</div>
                <div className="rule-item">1) Choose your stake, then select 1 or 2 cards.</div>
                <div className="rule-item">2) Minimum 2 players required. Game starts after 30 seconds.</div>
                <div className="rule-item">3) Numbers are called automatically every 3 seconds.</div>
                <div className="rule-item">4) Cards are marked automatically by the server.</div>
                <div className="rule-item">5) First player to complete a winning pattern wins the Derash!</div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <div style={{ color: 'var(--accent-gold)', fontWeight: 'bold', marginBottom: '8px' }}>🏆 Winning Patterns (Priority Order)</div>
                <div className="rule-item">🔲 Four Corners (1st)</div>
                <div className="rule-item">➡️ Horizontal Line (2nd)</div>
                <div className="rule-item">⬇️ Vertical Line (3rd)</div>
                <div className="rule-item">↗️ Diagonal (4th)</div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <div style={{ color: 'var(--accent-gold)', fontWeight: 'bold', marginBottom: '8px' }}>💰 Derash (Prize Pool)</div>
                <div className="rule-item">Derash = Number of players × Bet × 80%</div>
                <div className="rule-item">Winner takes the full Derash amount!</div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
                <div style={{ color: 'var(--accent-gold)', fontWeight: 'bold', marginBottom: '8px' }}>መመሪያ</div>
                <div className="rule-item">1) መወራረጃዎን ይምረጡ እና 1 ወይም 2 ካርዶች ይምረጡ።</div>
                <div className="rule-item">2) ቢያንስ 2 ተጫዋቾች ያስፈልጋሉ። 30 ሰከንድ በኋላ ጨዋታው ይጀምራል።</div>
                <div className="rule-item">3) ቁጥሮች በየ3 ሰከንድ በራስ-ሰር ይወጣሉ።</div>
                <div className="rule-item">4) ካርዶች በሰርቨር በራስ-ሰር ይሞላሉ።</div>
                <div className="rule-item">5) ፓተርን ያጠናቀቀ የመጀመሪያ ተጫዋች ድራሹን ያሸንፋል!</div>
              </div>
            </div>
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button className="btn btn-primary" onClick={() => setShowRules(false)}>
                Got it! 🎮
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
