/**
 * The admin page, served by the Worker at /admin behind Cloudflare Access. Same origin as the API,
 * so the Access cookie covers every call. Post data is only ever written with textContent.
 */
export const ADMIN_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Social hub admin</title>
<style>
  :root { color-scheme: dark; --bg: #0d0b09; --card: #17130f; --line: #2a241d; --fg: #f5efe6; --muted: #b3a89a; --accent: #fb923c; --bad: #f87171; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 60rem; margin: 0 auto; padding: 2rem 1rem 4rem; }
  h1 { margin: 0 0 .25rem; font-size: 1.75rem; } h2 { font-size: 1.1rem; margin: 2rem 0 .75rem; }
  .muted { color: var(--muted); } .bad { color: var(--bad); }
  form, .card { background: var(--card); border: 1px solid var(--line); border-radius: 1rem; padding: 1rem; }
  label { display: block; font-size: .85rem; color: var(--muted); margin: .75rem 0 .25rem; }
  input, textarea { width: 100%; padding: .6rem .75rem; border-radius: .6rem; border: 1px solid var(--line); background: var(--bg); color: var(--fg); font: inherit; }
  textarea { min-height: 6rem; resize: vertical; }
  button { cursor: pointer; border: 1px solid var(--line); background: transparent; color: var(--fg); border-radius: .6rem; padding: .45rem .8rem; font: inherit; min-height: 2.5rem; }
  button.primary { background: var(--accent); color: #1a1006; border-color: var(--accent); font-weight: 600; margin-top: 1rem; }
  button:focus-visible, input:focus-visible, textarea:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .75rem; }
  li { display: grid; gap: .35rem; }
  .row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
  .tag { font-size: .75rem; padding: .1rem .5rem; border-radius: 99px; border: 1px solid var(--line); color: var(--muted); }
  .hidden-post { opacity: .55; }
  .text { white-space: pre-wrap; overflow-wrap: anywhere; }
  a { color: var(--accent); overflow-wrap: anywhere; }
  #status:empty { display: none; }
</style>
</head>
<body>
<main>
  <h1>Social hub admin</h1>
  <p class="muted">Add LinkedIn and X posts, hide anything and check the live syncs.</p>
  <p id="status" role="status" aria-live="polite"></p>

  <h2>Add a LinkedIn or X post</h2>
  <form id="add">
    <label for="url">Post link</label>
    <input id="url" name="url" type="url" required placeholder="https://www.linkedin.com/feed/update/urn:li:activity:...">
    <label for="text">Text to show</label>
    <textarea id="text" name="text" required maxlength="3000"></textarea>
    <label for="date">Posted on (optional, defaults to now)</label>
    <input id="date" name="date" type="datetime-local">
    <button class="primary" type="submit">Add post</button>
  </form>

  <h2>Live syncs</h2>
  <div class="card" id="syncs"><span class="muted">Loading...</span></div>

  <h2>All posts</h2>
  <ul id="posts"><li class="muted">Loading...</li></ul>
</main>
<script>
  const $ = (s) => document.querySelector(s);
  const status = $('#status');
  const say = (msg, bad) => { status.textContent = msg; status.className = bad ? 'bad' : 'muted'; };

  async function api(path, init) {
    const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init && init.headers) } });
    if (res.status === 204) return null;
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Request failed (' + res.status + ').');
    return body;
  }

  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'on') for (const [ev, fn] of Object.entries(v)) n.addEventListener(ev, fn);
      else n.setAttribute(k, v);
    }
    for (const k of kids) n.append(k);
    return n;
  }

  async function loadPosts() {
    const list = $('#posts');
    try {
      const { posts } = await api('/admin/api/posts');
      list.replaceChildren(...(posts.length ? posts.map(row) : [el('li', { class: 'muted' }, 'No posts yet.')]));
    } catch (e) { say(e.message, true); }
  }

  function row(p) {
    const actions = el('div', { class: 'row' },
      el('button', { type: 'button', on: { click: () => change(p.id, { hidden: !p.hidden }) } }, p.hidden ? 'Show' : 'Hide'));
    if (p.source === 'curated') {
      actions.append(
        el('button', { type: 'button', on: { click: () => edit(p) } }, 'Edit text'),
        el('button', { type: 'button', on: { click: () => remove(p) } }, 'Delete'));
    }
    return el('li', { class: 'card' + (p.hidden ? ' hidden-post' : '') },
      el('div', { class: 'row' },
        el('span', { class: 'tag' }, p.platform), el('span', { class: 'tag' }, p.source),
        p.hidden ? el('span', { class: 'tag' }, 'hidden') : '',
        el('span', { class: 'muted' }, new Date(p.publishedAt).toLocaleString())),
      p.title ? el('strong', {}, p.title) : '',
      p.text ? el('div', { class: 'text' }, p.text) : '',
      el('a', { href: p.url, target: '_blank', rel: 'noreferrer' }, p.url),
      actions);
  }

  async function change(id, patch) {
    try { await api('/admin/api/posts/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(patch) }); say('Saved.'); loadPosts(); }
    catch (e) { say(e.message, true); }
  }
  function edit(p) { const text = prompt('Text to show', p.text || ''); if (text !== null) change(p.id, { text }); }
  async function remove(p) {
    if (!confirm('Delete this post from the feed?')) return;
    try { await api('/admin/api/posts/' + encodeURIComponent(p.id), { method: 'DELETE' }); say('Deleted.'); loadPosts(); }
    catch (e) { say(e.message, true); }
  }

  $('#add').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    const body = { url: f.url.value, text: f.text.value };
    if (f.date.value) body.published_at = new Date(f.date.value).toISOString();
    try { await api('/admin/api/posts', { method: 'POST', body: JSON.stringify(body) }); f.reset(); say('Added.'); loadPosts(); }
    catch (e) { say(e.message, true); }
  });

  async function loadSyncs() {
    const box = $('#syncs');
    try {
      const { lastSync } = await api('/health');
      box.replaceChildren(...Object.entries(lastSync).map(([name, s]) => el('div', { class: 'row' },
        el('strong', {}, name),
        s ? el('span', { class: s.ok ? 'muted' : 'bad' },
          (s.ok ? 'OK, ' + s.items + ' items' : 'Failed: ' + (s.error || 'unknown error')) + ' at ' + new Date(s.at).toLocaleString())
          : el('span', { class: 'muted' }, 'No sync yet'))));
    } catch (e) { box.textContent = e.message; }
  }

  loadPosts();
  loadSyncs();
</script>
</body>
</html>
`;
