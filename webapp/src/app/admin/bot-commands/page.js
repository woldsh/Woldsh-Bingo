'use client';

export default function AdminBotCommandsPage() {
    const commands = [
        { command: '/start', description: 'Start the bot and register user' },
        { command: '/play', description: 'Open the Bingo web app' },
        { command: '/balance', description: 'Check wallet balance' },
        { command: '/deposit', description: 'Deposit funds via Telebirr' },
        { command: '/withdraw', description: 'Request a withdrawal' },
        { command: '/history', description: 'View game history' },
        { command: '/invite', description: 'Get referral link' },
        { command: '/help', description: 'Show help message' },
    ];

    return (
        <div className="admin-page">
            <header className="admin-header"><h1 className="admin-title">Bot Commands</h1></header>
            <div className="admin-content">
                <div className="admin-card">
                    <div className="admin-card-header">
                        <div className="card-title"><span style={{ marginRight: 8 }}>🤖</span> Registered Commands</div>
                    </div>
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead><tr><th>COMMAND</th><th>DESCRIPTION</th></tr></thead>
                            <tbody>
                                {commands.map((cmd, i) => (
                                    <tr key={i}>
                                        <td style={{ fontFamily: 'monospace', color: 'var(--accent-primary)', fontWeight: 700 }}>{cmd.command}</td>
                                        <td>{cmd.description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
