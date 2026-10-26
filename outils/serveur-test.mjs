// Serveur de test local : sert une copie du site et imite l'API GitHub utilisée par l'espace formateur
// (lecture de fichiers, publication en un enregistrement). Rien n'est envoyé sur GitHub.
// Usage : node outils/serveur-test.mjs <dossier-copie-du-site> [port] [clé-de-test]
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { join, extname, dirname, normalize, relative } from 'node:path';
import { randomBytes } from 'node:crypto';

const RACINE = process.argv[2];
const PORT = Number(process.argv[3] || 8765);
const CLE = process.argv[4] || 'cle-de-test';
if (!RACINE || !existsSync(RACINE)) { console.error('Dossier du site introuvable.'); process.exit(1); }

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.pdf': 'application/pdf', '.bin': 'application/octet-stream' };
const blobs = new Map(), arbres = new Map(), commits = new Map();
let tete = 'c0';
commits.set(tete, { arbre: 't0', parent: null });

function sur(chemin) { // chemin relatif sûr à l'intérieur du site
  const p = normalize(join(RACINE, chemin));
  if (relative(RACINE, p).startsWith('..')) throw new Error('chemin interdit');
  return p;
}
function tous(dossier, prefixe = '') {
  return readdirSync(dossier, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? tous(join(dossier, e.name), prefixe + e.name + '/') : [prefixe + e.name]);
}
function json(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify(obj)); }
function corps(req) { return new Promise(ok => { const m = []; req.on('data', d => m.push(d)); req.on('end', () => ok(m.length ? JSON.parse(Buffer.concat(m).toString()) : {})); }); }
function id() { return randomBytes(10).toString('hex'); }

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/_api/')) {
      if (req.headers.authorization !== 'Bearer ' + CLE) return json(res, 401, { message: 'Bad credentials' });
      const m = url.pathname.match(/^\/_api\/repos\/[^/]+\/[^/]+\/(.*)$/);
      const route = m ? m[1] : '';
      if (req.method === 'GET' && route.startsWith('contents/')) {
        const p = sur(decodeURIComponent(route.slice(9)));
        if (!existsSync(p) || !statSync(p).isFile()) return json(res, 404, { message: 'Not Found' });
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' }); return res.end(readFileSync(p));
      }
      if (req.method === 'GET' && route === 'git/ref/heads/main') return json(res, 200, { object: { sha: tete } });
      if (req.method === 'GET' && route.startsWith('git/commits/')) { const c = commits.get(route.slice(12)); return c ? json(res, 200, { sha: route.slice(12), tree: { sha: c.arbre } }) : json(res, 404, {}); }
      if (req.method === 'GET' && route.startsWith('git/trees/')) return json(res, 200, { tree: tous(RACINE).map(p => ({ path: p, type: 'blob' })) });
      if (req.method === 'POST' && route === 'git/blobs') { const b = await corps(req); const s = 'b' + id(); blobs.set(s, Buffer.from(b.content, 'base64')); return json(res, 201, { sha: s }); }
      if (req.method === 'POST' && route === 'git/trees') { const b = await corps(req); const s = 't' + id(); arbres.set(s, b.tree); return json(res, 201, { sha: s }); }
      if (req.method === 'POST' && route === 'git/commits') { const b = await corps(req); const s = 'c' + id(); commits.set(s, { arbre: b.tree, parent: b.parents[0], message: b.message }); return json(res, 201, { sha: s }); }
      if (req.method === 'PATCH' && route === 'git/refs/heads/main') {
        const b = await corps(req), c = commits.get(b.sha);
        if (!c || c.parent !== tete) return json(res, 422, { message: 'Update is not a fast forward' });
        for (const e of arbres.get(c.arbre)) {
          const p = sur(e.path);
          if (e.sha === null) { rmSync(p, { force: true }); continue; }
          mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, blobs.get(e.sha));
        }
        tete = b.sha;
        console.log('[commit] ' + c.message.split('\n')[0] + ' — ' + arbres.get(c.arbre).map(e => (e.sha === null ? '-' : '+') + e.path).join(', '));
        return json(res, 200, { object: { sha: tete } });
      }
      return json(res, 404, { message: 'route non imitée : ' + req.method + ' ' + route });
    }
    let p = sur(decodeURIComponent(url.pathname));
    if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
    if (!existsSync(p)) { // comme GitHub Pages : page 404.html du site
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      return res.end(existsSync(join(RACINE, '404.html')) ? readFileSync(join(RACINE, '404.html')) : '404');
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(readFileSync(p));
  } catch (e) { res.writeHead(500); res.end(String(e)); }
}).listen(PORT, '127.0.0.1', () => console.log('Site de test : http://127.0.0.1:' + PORT + '/  (clé de test : ' + CLE + ')'));
