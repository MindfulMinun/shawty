// dotenv: https://deno.land/x/dotenv/README.md
import 'https://deno.land/x/dotenv/load.ts'
// std server: https://deno.land/std/http#http
import { serve, ServerRequest } from 'https://deno.land/std@0.62.0/http/server.ts'
import Datastore from 'https://x.nest.land/dndb@0.1.1/mod.ts'


/**
 * @typedef {import('./schema.ts').ShawtySchema} ShawtySchema
 */
/**
 * @typedef {import('./schema.ts').Redirect} Redirect
 */
/**
 * @typedef {import('./schema.ts').Hit} Hit
 */

const PORT = +(Deno.env.get('PORT') || '8080') || 8080
const server = serve({ port: PORT })
const db = new Datastore({ filename: './shawty.db', autoload: true })

console.log(`Live: http://localhost:${PORT}`)

// Listen for requests
for await (const req of server) {
    // First, check if the request is to root or any other resource and handle it
    // Then, check for redirects
    // If not found, then actually 404
    
    const url = new URL(`http://localhost${req.url}`)
    const [, id] = url.pathname.replace(/(^\/|\/$)/g, '').match(/(^[a-zA-Z0-9\-\_]{3,}$)/) || []

    // Post JSON to root to add things to the database :)
    if (url.pathname === '/' && req.method === 'POST') {
        const decoder = new TextDecoder('UTF-8')
        const txt = decoder.decode(await Deno.readAll(req.body))
        const data = JSON.parse(txt)
        // TODO: Check if the data is like a Redirect
        // If it is, add it to the db
    }

    // Actual resources like HTML or CSS might contain a slash or a period
    // This isn't really implemented yet X(
    if (!id) {
        sendJSON(req, 404, {
            error: "Invalid ID", id
        })
        continue
    }

    // Get the redirect that matches an ID
    // If it matches, redirect with that.
    // If it doesn't, 404

    /** @type {?Redirect} */
    // @ts-ignore
    const redir = await db.findOne({ id })

    // 404
    if (!redir) {
        sendJSON(req, 404, {
            error: "Not found", id
        })
        continue
    }

    // Add a hit to the database
    // @ts-ignore
    db.update({ id }, null, null, (/** @type {Redirect} */ redir) => {
        redir.hits.push({
            ua: req.headers.get('user-agent'),
            time: Date.now()
        })
        return redir
    })
    
    // Redirect
    req.respond({
        status: 301,
        headers: new Headers({
            'location': redir.endpoint,
            'cache-control': 'no-cache'
        })
    })
}


/**
 * Should the server send HTML instead of JSON for this response?
 * @param {ServerRequest} request
 * @returns {boolean}
 * @author MindfulMinun
 * @since 2020-07-29
 */
function shouldSendHTML(request) {
    return -1 < (request.headers.get('accept') || '').indexOf('text/html')
}

/**
 * Respond to a request with JSON
 * @param {ServerRequest} request
 * @param {number} [status] Defaults to 200 OK
 * @param {*} json
 * @returns {void}
 * @author MindfulMinun
 * @since 2020-07-29
 */
function sendJSON(request, status = 200, json) {
    const out = JSON.stringify(
        json, null,
        shouldSendHTML(request) ? 4 : 0
    )

    request.respond({
        body: out,
        status: status,
        headers: new Headers({
            'cache-control': 'no-cache',
            'Content-Type': 'application/json; charset=utf-8'
        })
    })
}
