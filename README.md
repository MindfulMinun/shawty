# shawty
a URL shortener built on Deno

With Deno 1.2.1 or greater:

```shell
deno run --allow-net --allow-env --allow-read --allow-write --unstable main.js
```

```js
// Post some data to root to get a short link
const url = 'https://example.com/my/super/long/endpoint?with=some&weird=things#on-it'
fetch(`?url=${encodeURIComponent(url)}`, { method: 'POST' })
    .then(r => r.json())
    .then(data => window.open(data.id))
```
