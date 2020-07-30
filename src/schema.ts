/** The schema describing the entire database */
export interface ShawtySchema {
    redirects: Redirect[]
}

/** Represents a redirect from a short ID to a long endpoint URL */
export interface Redirect {
    /**
     * The redirect endpoint. Must be a complete URL,
     * so it must include the protocol and the host, like in https://benjic.xyz/
     */
    endpoint: string
    /** The time this redirect was created */
    created: number
    /** The redirect's ID. */
    id: string
    /** The hits pertaining to this specific redirect */
    hits: Hit[]
}

export interface Hit {
    /** User-agent that triggered the request or null if the header wasn't present */
    ua: string | null
    /** The time this request was made */
    time: number
}
