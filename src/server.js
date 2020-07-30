// dotenv: https://deno.land/x/dotenv/README.md
import 'https://deno.land/x/dotenv/load.ts'
// std server: https://deno.land/std/http#http
import { serve, ServerRequest } from 'https://deno.land/std@0.62.0/http/server.ts'
// dndb: https://nest.land/package/dndb
import Datastore from 'https://x.nest.land/dndb@0.1.1/mod.ts'

// Import type definitions
/** @typedef {import('./schema.ts').Redirect} Redirect */
/** @typedef {import('./schema.ts').Hit}      Hit      */

// Error enum
import ShawtyErrors from './errors.js'

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
    const candidateId = generateId()

    // To add things to the database, POST to root with a url parameter :)
    if (url.pathname === '/' && req.method === 'POST') {
        const endpoint = url.searchParams.get('url')
        if (!endpoint) {
            sendJSON(req, 400, {
                errCode: ShawtyErrors.missingBody
            })
            continue
        }

        // Have JavaScript check whether the URL is valid or not
        try {
            // help im running out of synonyms for `url`
            const endpointUrlObj = new URL(endpoint)
            if (!['https:', 'http:', 'mailto:'].includes(endpointUrlObj.protocol)) {
                throw Error("Unexpected protocol :(")
            }
        } catch (err) {
            if (/protocol/.test(err.message)) {
                sendJSON(req, 400, {
                    errCode: ShawtyErrors.unexpectedProtocol
                })
                continue
            }
        }

        // If it's valid, add it to the db
        /** @type {Redirect} */
        const redir = {
            created: Date.now(),
            endpoint: endpoint,
            hits: [],
            id: (await candidateId)
        }
        // @ts-ignore -- db uses Promises; callbacks not required :)
        await db.insert(redir)

        sendJSON(req, 200, redir)
        continue
    }

    // Actual resources like HTML or CSS might contain a slash or a period
    // This isn't really implemented yet X(
    if (!id) {
        sendJSON(req, 404, {
            errCode: ShawtyErrors.idInvalid, id
        })
        continue
    }

    // Get the redirect that matches an ID
    // If it matches, redirect with that.
    // If it doesn't, 404

    /** @type {?Redirect} */
    // @ts-ignore -- db uses Promises; callbacks not required :)
    const redir = await db.findOne({ id })

    // 404
    if (!redir) {
        sendJSON(req, 404, {
            errCode: ShawtyErrors.notFound, id
        })
        continue
    }

    // Add a hit to the database
    redir.hits.push({
        ua: req.headers.get('user-agent'),
        time: Date.now()
    })
    // @ts-ignore -- db uses Promises; callbacks not required :)
    await db.remove({ id }).then(() => db.insert(redir))
    
    // Perform the redirect
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
 * @param {number} status Defaults to 200 OK
 * @param {*} json
 * @returns {void}
 * @author MindfulMinun
 * @since 2020-07-29
 */
function sendJSON(request, status, json) {
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


/**
 * Generates an unused id for a new Redirect
 * @returns {Promise<string>} The ID
 * @author MindfulMinun
 * @since 2020-07-30
 */
async function generateId() {
    let candidateId = ''
    const alphabet = 'bcdfghjlmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ23456789-_'
    while (candidateId.length < 12) {
        candidateId += alphabet[Math.floor(alphabet.length * Math.random())]
    }

    /** @type {?Redirect} */
    // @ts-ignore -- db uses Promises; callbacks not required :)
    const result = await db.findOne({ id: candidateId })
    if (result) return generateId()
    return candidateId
}
