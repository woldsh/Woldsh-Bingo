'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Gamepad2, Clock, Wallet, User } from 'lucide-react';

const navItems = [
    { href: '/', icon: <Gamepad2 size={22} />, label: 'Game' },
    { href: '/history', icon: <Clock size={22} />, label: 'History' },
    { href: '/wallet', icon: <Wallet size={22} />, label: 'Wallet' },
    { href: '/profile', icon: <User size={22} />, label: 'Profile' },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 'var(--nav-height)',
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            zIndex: 100,
            backdropFilter: 'blur(20px)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.3)',
        }}>
            {navItems.map((item) => {
                const isActive = pathname === item.href ||
                    (item.href !== '/' && pathname.startsWith(item.href));

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={isActive ? 'nav-item-active' : ''}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 16px',
                            borderRadius: '16px',
                            textDecoration: 'none',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                            background: isActive ? 'rgba(20, 184, 166, 0.12)' : 'transparent',
                            border: isActive ? '1px solid rgba(20, 184, 166, 0.15)' : '1px solid transparent',
                        }}
                    >
                        <div style={{
                            transform: isActive ? 'scale(1.1) translateY(-2px)' : 'scale(1)',
                            transition: 'transform 0.3s'
                        }}>
                            {item.icon}
                        </div>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: isActive ? '700' : '600',
                            letterSpacing: '0.3px',
                        }}>
                            {item.label}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}
