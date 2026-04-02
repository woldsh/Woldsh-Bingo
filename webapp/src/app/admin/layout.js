'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    LayoutDashboard, MessagesSquare, Gamepad2, Users, CreditCard,
    LineChart, History, Activity, Megaphone, ArrowDownToLine,
    ArrowUpFromLine, Settings, Bot, LogOut, Sun, Moon,
    Trophy, Wallet, AlertTriangle, ShieldCheck, Ticket, CircleDollarSign,
    Target, UserPlus, Gift, FileText, Database, Layers
} from 'lucide-react';

const sidebarSections = [
    {
        title: null,
        items: [
            { href: '/admin', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
        ]
    },
    {
        title: 'Game Management',
        items: [
            { href: '/admin/templates', icon: <Layers size={20} />, label: 'Room Templates' },
            { href: '/admin/rooms', icon: <MessagesSquare size={20} />, label: 'Rooms / Rounds' },
            { href: '/admin/live-games', icon: <Target size={20} />, label: 'Live Games' },
            { href: '/admin/win-patterns', icon: <Gamepad2 size={20} />, label: 'Win Patterns' },
        ]
    },
    {
        title: 'Users',
        items: [
            { href: '/admin/players', icon: <Users size={20} />, label: 'All Users' },
            { href: '/admin/wallets', icon: <Wallet size={20} />, label: 'User Wallets' },
            { href: '/admin/suspicious', icon: <AlertTriangle size={20} />, label: 'Suspicious Activity' },
        ]
    },
    {
        title: 'Payments',
        items: [
            { href: '/admin/deposits', icon: <ArrowDownToLine size={20} />, label: 'Deposits' },
            { href: '/admin/withdrawals', icon: <ArrowUpFromLine size={20} />, label: 'Withdrawals' },
            { href: '/admin/transactions', icon: <CreditCard size={20} />, label: 'Transactions' },
        ]
    },
    {
        title: 'Winners & Claims',
        items: [
            { href: '/admin/claims', icon: <ShieldCheck size={20} />, label: 'Claims Queue' },
            { href: '/admin/winners', icon: <Trophy size={20} />, label: 'Winners History' },
        ]
    },
    {
        title: 'Referrals',
        items: [
            { href: '/admin/referrals', icon: <UserPlus size={20} />, label: 'Referral Stats' },
            { href: '/admin/referral-rewards', icon: <Gift size={20} />, label: 'Referral Rewards' },
        ]
    },
    {
        title: 'Support & Content',
        items: [
            { href: '/admin/tickets', icon: <Ticket size={20} />, label: 'Tickets' },
            { href: '/admin/faq', icon: <FileText size={20} />, label: 'FAQ / How To Play' },
            { href: '/admin/bot-commands', icon: <Bot size={20} />, label: 'Bot Menus' },
            { href: '/admin/announcements', icon: <Megaphone size={20} />, label: 'Announcements' },
        ]
    },
    {
        title: 'Reports',
        items: [
            { href: '/admin/reports/revenue', icon: <CircleDollarSign size={20} />, label: 'Revenue Reports' },
            { href: '/admin/reports/games', icon: <LineChart size={20} />, label: 'Game Reports' },
            { href: '/admin/reports/players', icon: <Activity size={20} />, label: 'Player Reports' },
        ]
    },
    {
        title: 'System',
        items: [
            { href: '/admin/settings', icon: <Settings size={20} />, label: 'Settings' },
            { href: '/admin/admin-users', icon: <Users size={20} />, label: 'Admin Users' },
            { href: '/admin/audit', icon: <History size={20} />, label: 'Audit Logs' },
            { href: '/admin/health', icon: <Database size={20} />, label: 'Health' },
        ]
    }
];

export default function AdminLayout({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const [admin, setAdmin] = useState(null);
    const [checking, setChecking] = useState(true);
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        // Read theme from localStorage
        const storedTheme = localStorage.getItem('admin_theme');
        if (storedTheme === 'dark') {
            setTheme('dark');
        }
    }, []);

    useEffect(() => {
        // Skip auth check for login page
        if (pathname === '/admin/login') {
            setChecking(false);
            return;
        }

        const stored = localStorage.getItem('admin_auth');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (!parsed.token) {
                    localStorage.removeItem('admin_auth');
                    router.push('/admin/login');
                    return;
                }
                setAdmin(parsed);
            } catch {
                localStorage.removeItem('admin_auth');
                router.push('/admin/login');
            }
        } else {
            router.push('/admin/login');
        }
        setChecking(false);
    }, [pathname, router]);

    // Show login page without sidebar
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    // Loading state
    if (checking) {
        return (
            <div className={`admin-container ${theme === 'dark' ? 'dark' : ''}`} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    // Not authed yet (redirect will happen via useEffect)
    if (!admin) {
        return (
            <div className={`admin-container ${theme === 'dark' ? 'dark' : ''}`} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    function handleLogout() {
        localStorage.removeItem('admin_auth');
        router.push('/admin/login');
    }

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('admin_theme', newTheme);
    };

    return (
        <div className={`admin-container ${theme === 'dark' ? 'dark' : ''}`}>
            {/* Sidebar */}
            <aside className="admin-sidebar" style={{ overflowY: 'auto', background: 'var(--admin-sidebar-bg)' }}>
                <div className="admin-brand" style={{ position: 'sticky', top: 0, zIndex: 10, padding: '16px 24px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', borderBottom: '1px solid var(--admin-border)', gap: '12px', background: 'var(--admin-sidebar-bg)' }}>
                    <img src="/banner.png" alt="Woldsh Bingo" style={{ height: 44, objectFit: 'contain' }} />
                    <div className="brand-name" style={{ fontSize: 16, fontWeight: 800, whiteSpace: 'nowrap', color: 'var(--admin-text-primary)' }}>Woldsh Bingo</div>
                </div>

                <nav className="admin-nav" style={{ padding: '20px 0' }}>
                    {sidebarSections.map((section, idx) => (
                        <div key={idx} style={{ marginBottom: section.title ? 20 : 10 }}>
                            {section.title && (
                                <div className="admin-nav-section" style={{ paddingLeft: 24 }}>{section.title.toUpperCase()}</div>
                            )}
                            {section.items.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`admin-nav-item ${isActive ? 'active' : ''}`}
                                    >
                                        <span className="nav-icon">{item.icon}</span>
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <div className="admin-bottom-profile" style={{ position: 'sticky', bottom: 0, zIndex: 10, borderTop: '1px solid var(--admin-border)', background: 'var(--admin-sidebar-bg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <div className="admin-profile-info" style={{ marginBottom: 0 }}>
                            <div className="admin-profile-avatar">
                                {(admin.username || 'A')[0].toUpperCase()}
                            </div>
                            <div>
                                <div className="admin-profile-name">{admin.username}</div>
                                <div className="admin-profile-role">● {admin.role}</div>
                            </div>
                        </div>
                        <button onClick={toggleTheme} className="admin-icon-btn" style={{ width: 36, height: 36 }} title="Toggle Theme">
                            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                        </button>
                    </div>
                    <button className="admin-logout-btn" onClick={handleLogout}>
                        <LogOut size={16} /> Log out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="admin-main">
                {children}
            </main>
        </div>
    );
}
