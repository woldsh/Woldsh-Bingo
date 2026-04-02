const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:wellson1212/g@db.mfgndrahaxklxdzrhpuz.supabase.co:5432/postgres'
});

async function test() {
    try {
        console.log('Connecting...');
        await client.connect();
        console.log('Connected successfully!');
        const res = await client.query('SELECT NOW()');
        console.log(res.rows[0]);
        await client.end();
    } catch (err) {
        console.error('Connection error:', err.message);
    }
}

test();
