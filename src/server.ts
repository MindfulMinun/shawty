import 'https://deno.land/x/dotenv/load.ts'
import { opine, request as OpineRequest } from 'https://x.nest.land/opine@0.21.2/mod.ts'
import { Schema, connect, Q } from "https://deno.land/x/cotton@v0.7.0/mod.ts";

const port = +(Deno.env.get('PORT') ?? '8080')
const db = await connect({
    type: 'sqlite',
    database: 'shawty.db'
    // database: ':memory:'
})
const schema = new Schema(db)
const app = opine()
await initDB()

app.get('/', (req, res) => {
    res.json({
        'Made with <3 by MindfulMinun': "https://benjic.xyz"
    })
    const ip = getIP(req)
    fetch(`https://ipinfo.io/${ip}/json`, {
        headers: {
            authorization: `Bearer ${Deno.env.get('IPINFO_TOKEN')}`
        }
    }).then(r => r.json()).then(json => {
        console.log(req.headers.get('user-agent'), json)
    })
})

// Redirect middleware
app.use(async (req, res, next) => {
    const id = req.path.slice(1)
    const query = db.table('redirects').select('endpoint').where('id', Q.eq(id))
    const [redirect] = await query.execute()

    if (redirect) {
        return res.redirect(redirect.endpoint as string)
    }

    next()
})

// 404 middleware
app.use((_, res) => {
    res.setStatus(404).json({
        error: 404
    })
})

app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`)
})

async function initDB() {
    if (!await schema.hasTable('redirects')) {
        await schema.createTable('redirects', table => {
            table.varchar('id')
            table.datetime('created')
            table.text('endpoint')
        })
        await db.table('redirects').insert({
            id: 'benji',
            created: +new Date(),
            endpoint: 'https://benjic.xyz',
        }).execute()
    }
    if (!await schema.hasTable('hits')) {
        await schema.createTable('hits', table => {
            table.id()
            table.date('time')
            table.varchar('ua')
            table.varchar('targetId')
        })
    }
}

function getIP(req: typeof OpineRequest) {
    const forwardHeader = req.headers.get('x-forwarded-for')
    if (forwardHeader) {
        return forwardHeader.split(',')[0]
    }
    // @ts-ignore
    return req.conn.remoteAddr.hostname
}

db.table('redirects')
    .select('id', 'created', 'endpoint')
    .execute()
    .then(console.log)
