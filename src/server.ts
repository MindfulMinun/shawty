import { opine } from 'https://x.nest.land/opine@0.21.2/mod.ts'
import { Schema, connect, Q } from "https://deno.land/x/cotton@v0.7.0/mod.ts";

const db = await connect({
    type: 'sqlite',
    database: 'shawty.db'
    // database: ':memory:'
})
const schema = new Schema(db)
const app = opine()
await initDB()


app.post('/', (req, res) => {
    res.json({
        'Made with <3 by MindfulMinun': "https://benjic.xyz"
    })
})
app.use(async (req, res, next) => {
    const id = req.path.slice(1)
    const query = db.table('redirects').select('endpoint').where('id', Q.eq(id))
    const [redirect] = await query.execute()

    if (redirect) {
        res.redirect(redirect.endpoint as string)
    } else {
        next()
    }
})
app.listen(1337, () => {
    console.log('Listening on http://localhost:1337')
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
const res = await db.table('redirects').select('id', 'created', 'endpoint').execute()

console.log(res)
