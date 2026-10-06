(function (root) {
  const allowed = new Set(['A', 'B', 'C', 'D', 'E']);
  function randomInt(max) {
    const limit = Math.floor(4294967296 / max) * max;
    const value = new Uint32Array(1);
    do { root.crypto.getRandomValues(value); } while (value[0] >= limit);
    return value[0] % max;
  }
  function mixed(questions, count, rng = randomInt) {
    const pool = [...questions];
    if (!Number.isInteger(count) || count < 1 || count > pool.length) throw new Error('Quantidade inválida');
    for (let i = pool.length - 1; i > 0; i--) {
      const j = rng(i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  }
  function score(questions, answers) {
    return {
      hits: questions.filter(q => q.answer === '*' || answers[q.id] === q.answer).length,
      total: questions.length,
      answered: questions.filter(q => allowed.has(answers[q.id])).length,
      provisional: questions.some(q => q.keyStatus === 'preliminar')
    };
  }
  function normalize(input, questions) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Backup inválido');
    const ids = new Set(questions.map(q => q.id));
    const entries = (o, accept) => Object.fromEntries(Object.entries(o || {}).filter(([id,v]) => ids.has(id) && accept(v)));
    const state = {answers:entries(input.answers,v => allowed.has(v)),notes:entries(input.notes,v => typeof v === 'string' && v.length <= 20000),favorites:Array.isArray(input.favorites) ? [...new Set(input.favorites.filter(id => ids.has(id)))] : [],history:[],session:null};
    state.history = Array.isArray(input.history) ? input.history.filter(h => h && typeof h.exam === 'string' && Number.isInteger(h.hits) && Number.isInteger(h.total) && h.hits >= 0 && h.hits <= h.total && h.total > 0 && Number.isFinite(Date.parse(h.date))).slice(0,200) : [];
    const s = input.session;
    if (s && Array.isArray(s.ids) && s.ids.length && s.ids.length <= 200 && new Set(s.ids).size === s.ids.length && s.ids.every(id => ids.has(id)) && Number.isFinite(s.end) && typeof s.exam === 'string') {
      state.session = {...s,answers:entries(s.answers,v => allowed.has(v))};
    }
    return state;
  }
  const api = {mixed, score, normalize};
  if (typeof module !== 'undefined') module.exports = api;
  else root.StudyCore = api;
})(globalThis);
