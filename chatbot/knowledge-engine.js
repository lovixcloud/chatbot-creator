/**
 * Knowledge Base Matching Engine
 * Performs deterministic tokenization, stop-word filtering, n-gram overlap,
 * keyword weighting, and Levenshtein similarity scoring.
 */

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
  'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our',
  'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than',
  'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
  'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when',
  'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

export class KnowledgeEngine {
  /**
   * Normalize and tokenize text into words.
   * @param {string} text
   * @returns {string[]}
   */
  static tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !STOP_WORDS.has(w));
  }

  /**
   * Calculate Levenshtein distance between two strings.
   * @param {string} a
   * @param {string} b
   * @returns {number}
   */
  static levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    const row = [];
    for (let i = 0; i <= b.length; i++) row[i] = i;

    for (let i = 1; i <= a.length; i++) {
      let prev = i;
      for (let j = 1; j <= b.length; j++) {
        let val;
        if (a[i - 1] === b[j - 1]) {
          val = row[j - 1];
        } else {
          val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
        }
        row[j - 1] = prev;
        prev = val;
      }
      row[b.length] = prev;
    }
    return row[b.length];
  }

  /**
   * Calculate string similarity score from 0.0 to 1.0.
   * @param {string} s1
   * @param {string} s2
   * @returns {number}
   */
  static stringSimilarity(s1, s2) {
    const longer = s1.length > s2.length ? s1 : s2;
    if (longer.length === 0) return 1.0;
    const dist = this.levenshtein(s1, s2);
    return (longer.length - dist) / longer.length;
  }

  /**
   * Search knowledge base for best matching entry.
   * @param {string} query
   * @param {Array<object>} knowledgeBase
   * @param {number} [confidenceThreshold=0.35]
   * @returns {{ match: object|null, score: number, candidateCount: number }}
   */
  static findBestMatch(query, knowledgeBase, confidenceThreshold = 0.35) {
    if (!query || !Array.isArray(knowledgeBase) || knowledgeBase.length === 0) {
      return { match: null, score: 0, candidateCount: 0 };
    }

    const cleanQuery = query.toLowerCase().trim();
    const queryTokens = this.tokenize(cleanQuery);

    let bestScore = 0;
    let bestEntry = null;

    for (const item of knowledgeBase) {
      let score = 0;

      // 1. Exact or near-exact full question match
      const qLower = (item.question || '').toLowerCase().trim();
      if (cleanQuery === qLower) {
        score = 1.0;
      } else {
        const fullSim = this.stringSimilarity(cleanQuery, qLower);
        if (fullSim > 0.8) {
          score = Math.max(score, fullSim);
        }
      }

      // 2. Alternative phrasings
      if (Array.isArray(item.alternativePhrasings)) {
        for (const alt of item.alternativePhrasings) {
          const altLower = alt.toLowerCase().trim();
          if (cleanQuery === altLower) {
            score = Math.max(score, 1.0);
          } else {
            const altSim = this.stringSimilarity(cleanQuery, altLower);
            if (altSim > 0.8) {
              score = Math.max(score, altSim);
            }
          }
        }
      }

      // 3. Keyword matching (weighted high: each matched keyword provides strong relevance signal)
      if (Array.isArray(item.keywords) && item.keywords.length > 0) {
        let kwMatches = 0;
        for (const kw of item.keywords) {
          const kwLower = kw.toLowerCase().trim();
          if (cleanQuery.includes(kwLower)) {
            kwMatches++;
          }
        }
        if (kwMatches > 0) {
          // A single keyword match gives at least 0.45; multiple matches boost up to 0.95
          const kwScore = 0.35 + (kwMatches / Math.min(item.keywords.length, 3)) * 0.55;
          score = Math.max(score, kwScore);
        }
      }

      // 4. Token overlap
      if (queryTokens.length > 0) {
        const questionTokens = this.tokenize(item.question || '');
        const intersection = queryTokens.filter(t => questionTokens.includes(t));
        const tokenScore = (intersection.length / Math.max(queryTokens.length, questionTokens.length, 1)) * 0.8;
        score = Math.max(score, tokenScore);
      }

      // Apply priority modifier (up to +10%)
      const priorityBoost = ((item.priority || 5) - 5) * 0.02;
      score = Math.min(1.0, score + priorityBoost);

      if (score > bestScore) {
        bestScore = score;
        bestEntry = item;
      }
    }

    if (bestScore >= confidenceThreshold) {
      return { match: bestEntry, score: bestScore, candidateCount: knowledgeBase.length };
    }

    return { match: null, score: bestScore, candidateCount: knowledgeBase.length };
  }
}
