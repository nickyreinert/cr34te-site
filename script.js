/* Fake ChatGPT clone. Everything lives in one closure: no globals, no storage, no network. */
(function () {
  'use strict';

  var FENCE = '`'.repeat(3);

  /* Canned knowledge base. keys are matched against the lowercased user message. */
  var KB = [
    { keys: ['binary', 'search', 'sorted'], title: 'Binary search', lang: 'python',
      text: 'Binary search halves the search range on every step. It needs a sorted array.',
      code: 'def binary_search(a, target):\n    lo, hi = 0, len(a) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if a[mid] == target:\n            return mid\n        if a[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1',
      note: 'Time: O(log n). Space: O(1).' },
    { keys: ['quicksort', 'quick', 'pivot', 'sort'], title: 'Quicksort', lang: 'javascript',
      text: 'Quicksort picks a pivot, partitions the rest around it and recurses. This version favors clarity over in-place speed.',
      code: 'function quicksort(a) {\n  if (a.length <= 1) return a;\n  const p = a[a.length >> 1];\n  const lt = a.filter(x => x < p);\n  const eq = a.filter(x => x === p);\n  const gt = a.filter(x => x > p);\n  return [...quicksort(lt), ...eq, ...quicksort(gt)];\n}',
      note: 'Average O(n log n), worst case O(n^2) with bad pivots. This version uses O(n) extra memory.' },
    { keys: ['merge', 'stable'], title: 'Merge sort', lang: 'python',
      text: 'Merge sort splits the list in half, sorts both halves and merges them. It is stable and has no bad inputs.',
      code: 'def merge_sort(a):\n    if len(a) <= 1:\n        return a\n    m = len(a) // 2\n    l, r = merge_sort(a[:m]), merge_sort(a[m:])\n    out, i, j = [], 0, 0\n    while i < len(l) and j < len(r):\n        if l[i] <= r[j]:\n            out.append(l[i])\n            i += 1\n        else:\n            out.append(r[j])\n            j += 1\n    return out + l[i:] + r[j:]',
      note: 'Time: O(n log n) always. Space: O(n).' },
    { keys: ['dijkstra', 'shortest', 'path', 'route', 'weighted'], title: "Dijkstra's shortest path", lang: 'python',
      text: "Dijkstra's algorithm expands the closest unvisited node first, using a min-heap. Edge weights must not be negative.",
      code: "import heapq\n\ndef dijkstra(graph, src):\n    dist = {src: 0}\n    heap = [(0, src)]\n    while heap:\n        d, u = heapq.heappop(heap)\n        if d > dist.get(u, float('inf')):\n            continue\n        for v, w in graph[u]:\n            nd = d + w\n            if nd < dist.get(v, float('inf')):\n                dist[v] = nd\n                heapq.heappush(heap, (nd, v))\n    return dist",
      note: 'Time: O((V + E) log V). For negative weights use Bellman-Ford.' },
    { keys: ['bfs', 'breadth', 'graph', 'traverse', 'queue'], title: 'Breadth-first search', lang: 'python',
      text: 'BFS visits nodes level by level with a queue. On unweighted graphs it finds shortest paths.',
      code: 'from collections import deque\n\ndef bfs(graph, start):\n    seen, q, order = {start}, deque([start]), []\n    while q:\n        u = q.popleft()\n        order.append(u)\n        for v in graph[u]:\n            if v not in seen:\n                seen.add(v)\n                q.append(v)\n    return order',
      note: 'Time: O(V + E). Space: O(V).' },
    { keys: ['dynamic', 'dp', 'knapsack', 'memo', 'optimal'], title: '0/1 knapsack', lang: 'python',
      text: 'Dynamic programming stores answers to subproblems. For 0/1 knapsack, dp[c] is the best value at capacity c. Iterating capacity downwards makes sure each item is used once.',
      code: 'def knapsack(items, cap):\n    dp = [0] * (cap + 1)\n    for w, v in items:\n        for c in range(cap, w - 1, -1):\n            dp[c] = max(dp[c], dp[c - w] + v)\n    return dp[cap]',
      note: 'Time: O(n * cap). Space: O(cap). This is pseudo-polynomial, not truly polynomial.' },
    { keys: ['prime', 'sieve', 'eratosthenes'], title: 'Sieve of Eratosthenes', lang: 'javascript',
      text: 'The sieve crosses out multiples of each prime, starting at its square. Whatever remains is prime.',
      code: 'function sieve(n) {\n  const is = new Uint8Array(n + 1).fill(1);\n  is[0] = is[1] = 0;\n  for (let i = 2; i * i <= n; i++)\n    if (is[i]) for (let j = i * i; j <= n; j += i) is[j] = 0;\n  return [...is.keys()].filter(i => is[i]);\n}',
      note: 'Time: O(n log log n). Space: O(n).' },
    { keys: ['union', 'find', 'disjoint', 'connected', 'component'], title: 'Union-find', lang: 'python',
      text: 'Union-find tracks which elements belong to the same set. Path halving keeps trees almost flat.',
      code: 'class DSU:\n    def __init__(self, n):\n        self.p = list(range(n))\n\n    def find(self, x):\n        while self.p[x] != x:\n            self.p[x] = self.p[self.p[x]]\n            x = self.p[x]\n        return x\n\n    def union(self, a, b):\n        self.p[self.find(a)] = self.find(b)',
      note: 'Amortized near O(1) per operation. Adding union by size gives the inverse Ackermann bound.' },
    { keys: ['gcd', 'euclid', 'divisor', 'greatest'], title: 'Euclidean algorithm', lang: 'python',
      text: 'The GCD of a and b equals the GCD of b and a mod b. Repeat until the remainder is zero.',
      code: 'def gcd(a, b):\n    while b:\n        a, b = b, a % b\n    return a',
      note: 'Time: O(log min(a, b)).' }
  ];

  var INTROS = ['Here is how it works.', 'Short version below.', 'This is the usual approach.', 'A standard way to do this:'];
  var FALLBACKS = ['I am not sure what you mean, but this is related and might help.', 'No exact match for that. A common algorithm you may want instead:'];

  /* Pick a KB entry by keyword hits; random if nothing matches. */
  function pick(msg) {
    var low = msg.toLowerCase(), best = null, bestHits = 0;
    KB.forEach(function (e) {
      var hits = e.keys.filter(function (k) { return low.indexOf(k) !== -1; }).length;
      if (hits > bestHits) { best = e; bestHits = hits; }
    });
    if (best) return { entry: best, matched: true };
    return { entry: KB[Math.floor(Math.random() * KB.length)], matched: false };
  }

  function rand(list) { return list[Math.floor(Math.random() * list.length)]; }

  function buildAnswer(msg) {
    var r = pick(msg), e = r.entry;
    var intro = r.matched ? rand(INTROS) : rand(FALLBACKS);
    return intro + '\n\n' + e.text + '\n\n' + FENCE + e.lang + '\n' + e.code + '\n' + FENCE + '\n\n' + e.note;
  }

  /* Pre-existing sessions, built from the KB so the content is real. */
  var SEED = [
    ['How does binary search work?', 0],
    ['Sort a list fast in JavaScript', 1],
    ['Find the shortest route in a weighted graph', 3],
    ['Generate all primes below a million', 6],
    ['Solve knapsack with dynamic programming', 5]
  ];

  var nextId = 1;
  var sessions = SEED.map(function (s) {
    var e = KB[s[1]];
    return {
      id: nextId++,
      title: s[0],
      messages: [
        { role: 'user', text: s[0] },
        { role: 'bot', text: rand(INTROS) + '\n\n' + e.text + '\n\n' + FENCE + e.lang + '\n' + e.code + '\n' + FENCE + '\n\n' + e.note }
      ]
    };
  });
  var activeId = sessions[0].id;
  var busy = false;
  var timer = null;

  var app = document.getElementById('app');
  var listEl = document.getElementById('sessions');
  var msgEl = document.getElementById('messages');
  var inputEl = document.getElementById('input');
  var sendEl = document.getElementById('send');

  function active() {
    return sessions.filter(function (s) { return s.id === activeId; })[0];
  }

  /* Turn raw text with fenced code blocks into DOM. Uses textContent only. */
  function renderText(target, text) {
    target.textContent = '';
    text.split(FENCE).forEach(function (part, i) {
      if (i % 2 === 0) {
        part.split('\n\n').forEach(function (para) {
          if (!para.trim()) return;
          var p = document.createElement('p');
          p.textContent = para.trim();
          target.appendChild(p);
        });
      } else {
        var nl = part.indexOf('\n');
        var lang = nl === -1 ? part : part.slice(0, nl);
        var code = nl === -1 ? '' : part.slice(nl + 1);
        var box = document.createElement('div');
        box.className = 'code';
        var head = document.createElement('div');
        head.className = 'code-head';
        head.textContent = lang;
        var pre = document.createElement('pre');
        var c = document.createElement('code');
        c.textContent = code;
        pre.appendChild(c);
        box.appendChild(head);
        box.appendChild(pre);
        target.appendChild(box);
      }
    });
  }

  function addRow(role) {
    var row = document.createElement('div');
    row.className = 'row ' + role;
    var b = document.createElement('div');
    b.className = 'bubble';
    row.appendChild(b);
    msgEl.appendChild(row);
    return b;
  }

  function renderSidebar() {
    listEl.textContent = '';
    sessions.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'session' + (s.id === activeId ? ' active' : '');
      b.textContent = s.title;
      b.addEventListener('click', function () {
        stream(null);
        activeId = s.id;
        app.classList.remove('open');
        renderAll();
      });
      listEl.appendChild(b);
    });
  }

  function renderMessages() {
    msgEl.textContent = '';
    var s = active();
    if (!s.messages.length) {
      var e = document.createElement('div');
      e.id = 'empty';
      e.textContent = 'What can I help with?';
      msgEl.appendChild(e);
      return;
    }
    s.messages.forEach(function (m) {
      var b = addRow(m.role);
      if (m.role === 'bot') renderText(b, m.text); else b.textContent = m.text;
    });
    msgEl.scrollTop = msgEl.scrollHeight;
  }

  function renderAll() {
    renderSidebar();
    renderMessages();
  }

  function setBusy(v) {
    busy = v;
    sendEl.disabled = v;
  }

  /* Reveal text in chunks. Passing null cancels a running stream. */
  function stream(job) {
    if (timer) { clearInterval(timer); timer = null; }
    if (!job) { setBusy(false); return; }
    var pos = 0;
    setBusy(true);
    job.bubble.classList.add('cursor');
    timer = setInterval(function () {
      pos = Math.min(job.text.length, pos + 3 + Math.floor(Math.random() * 5));
      renderText(job.bubble, job.text.slice(0, pos));
      msgEl.scrollTop = msgEl.scrollHeight;
      if (pos >= job.text.length) {
        clearInterval(timer);
        timer = null;
        job.bubble.classList.remove('cursor');
        setBusy(false);
      }
    }, 20);
  }

  function send() {
    var text = inputEl.value.trim();
    if (!text || busy) return;
    var s = active();
    var first = !s.messages.length;
    s.messages.push({ role: 'user', text: text });
    if (first) s.title = text.length > 40 ? text.slice(0, 40) + '...' : text;
    var answer = buildAnswer(text);
    s.messages.push({ role: 'bot', text: answer });
    inputEl.value = '';
    inputEl.style.height = 'auto';
    renderSidebar();
    if (first) msgEl.textContent = '';
    /* Re-render history except the new answer, then stream the answer into place */
    var empty = msgEl.querySelector('#empty');
    if (empty) empty.remove();
    var ub = addRow('user');
    ub.textContent = text;
    var bb = addRow('bot');
    msgEl.scrollTop = msgEl.scrollHeight;
    /* Short delay imitates "thinking" */
    setBusy(true);
    timer = setTimeout(function () { timer = null; stream({ bubble: bb, text: answer }); }, 400);
  }

  document.getElementById('new-chat').addEventListener('click', function () {
    if (timer) { clearTimeout(timer); clearInterval(timer); timer = null; }
    setBusy(false);
    var s = { id: nextId++, title: 'New chat', messages: [] };
    sessions.unshift(s);
    activeId = s.id;
    app.classList.remove('open');
    renderAll();
    inputEl.focus();
  });

  document.getElementById('menu').addEventListener('click', function () { app.classList.toggle('open'); });
  document.getElementById('backdrop').addEventListener('click', function () { app.classList.remove('open'); });
  sendEl.addEventListener('click', send);
  inputEl.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); send(); }
  });
  inputEl.addEventListener('input', function () {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + 'px';
  });

  renderAll();
})();
