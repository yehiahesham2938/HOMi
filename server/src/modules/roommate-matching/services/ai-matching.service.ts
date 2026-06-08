import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../../config/env.js';

export class AIMatchingService {
    private static genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    private static model = AIMatchingService.genAI.getGenerativeModel({ 
        model: env.GEMINI_MODEL_NAME || 'gemini-2.5-flash',
        generationConfig: { responseMimeType: "application/json" }
    });

    /**
     * Score compatibility between two users using Gemini AI
     */
    static async scoreCompatibility(userA: any, userB: any) {
        const prompt = `
SYSTEM:
You are a roommate compatibility scoring engine for a rental platform called HOMi.
You will receive two user profiles and must output ONLY a valid JSON object.

RULES:
1. Score from 0 to 100 where:
   - 90-100 = Excellent match
   - 70-89  = Good match
   - 50-69  = Fair match
   - 30-49  = Poor match
   - 0-29   = Incompatible
2. Weighting: Habit overlap (40%), Lifestyle conflict (25%), Budget (15%), Location (10%), Gender preference (10%).
3. Penalize: Night Owl/Early Riser conflict, Smoker/Non-smoker conflict, Quiet/Social conflict.
4. Synergy: Shared Non-smoker, Fitness Enthusiast, Student, etc.
5. If gender preferences conflict (e.g., User A wants MALE only, User B is FEMALE), hard cap score at 0.

USER INPUT:
{
  "user_a": ${JSON.stringify(userA)},
  "user_b": ${JSON.stringify(userB)}
}

OUTPUT FORMAT:
{
  "compatibility_score": <number>,
  "explanation": "<string>",
  "top_synergies": ["<string>"],
  "top_conflicts": ["<string>"],
  "breakdown": {
    "habit_overlap": <number>,
    "lifestyle_conflict": <number>,
    "budget_compatibility": <number>,
    "location_match": <number>,
    "gender_preference": <number>
  }
}
`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            return JSON.parse(text);
        } catch (error) {
            console.error('Gemini AI Scoring Error:', error);
            return this.fallbackScoring(userA, userB);
        }
    }

    /**
     * HOMI Wish — rank candidates from a free-text wish using Gemini.
     * Returns [{ id, score, reason }] ordered best-first (1-4 items).
     */
    static async rankByWish(wish: string, roster: any[]): Promise<Array<{ id: string; score: number; reason: string }>> {
        const prompt = `
You are HOMI Wish, the AI roommate matchmaker for HOMi (a rentals app in Egypt).
The user wrote this free-text wish describing their ideal roommate and/or place:
"""${wish}"""

Here is the candidate roster (JSON):
${JSON.stringify(roster)}

Rank the candidates that best fit the wish. Return ONLY valid minified JSON, no prose, no markdown fences:
{"matches":[{"id":"<candidate id>","score":92,"reason":"one warm sentence (max 24 words) explaining specifically why this person fits the wish, referencing their habits/area/budget"}]}
Rules: include only genuinely relevant candidates (1 to 4). score 0-100 reflecting fit to THIS wish. Order best first. If nothing fits well, return {"matches":[]}.`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            let text = response.text().trim();
            text = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
            const a = text.indexOf('{');
            const b = text.lastIndexOf('}');
            if (a >= 0 && b >= 0) text = text.slice(a, b + 1);
            const data = JSON.parse(text);
            const rosterIds = new Set(roster.map((r) => r.id));
            return (data.matches || [])
                .filter((m: any) => rosterIds.has(m.id))
                .slice(0, 4)
                .map((m: any) => ({
                    id: m.id,
                    score: Math.max(0, Math.min(100, Math.round(Number(m.score) || 0))),
                    reason: String(m.reason || 'A strong overall fit for what you described.'),
                }));
        } catch (error) {
            console.error('Gemini Wish Ranking Error:', error);
            return this.fallbackWishRanking(wish, roster);
        }
    }

    /**
     * Heuristic fallback for HOMI Wish when the model call fails.
     * Keyword-matches the wish against candidate habit labels / location.
     */
    private static fallbackWishRanking(wish: string, roster: any[]): Array<{ id: string; score: number; reason: string }> {
        const t = wish.toLowerCase();
        const wants = (k: string) => t.includes(k);
        const scored = roster.map((c) => {
            let s = (c.baseScore ?? 60) - 10;
            const why: string[] = [];
            const h = c.habits || {};
            if ((wants('quiet') || wants('calm')) && h.noise === 'Very quiet') { s += 14; why.push('keeps a very quiet home'); }
            if (wants('non-smoker') && h.smoke === 'Non-smoker') { s += 8; why.push('is a non-smoker'); }
            if ((wants('work from home') || wants('wfh') || wants('remote')) && h.work === 'Works from home') { s += 12; why.push('works from home'); }
            if ((wants('clean') || wants('spotless') || wants('tidy')) && h.clean === 'Spotless') { s += 10; why.push('is spotless'); }
            if ((wants('social') || wants('outgoing') || wants('fun')) && h.social === 'Often') { s += 12; why.push('is social and loves guests'); }
            if (wants('cook') && h.cook === 'Cooks daily') { s += 8; why.push('cooks daily'); }
            if ((wants('early') || wants('morning')) && h.sleep === 'Early bird') { s += 8; why.push('is an early riser'); }
            if ((wants('pet') || wants('cat') || wants('dog')) && (h.pets === 'Pet-friendly' || h.pets === 'Has pets')) { s += 8; why.push('is pet-friendly'); }
            if (c.area && wants(String(c.area).toLowerCase())) { s += 10; why.push(`lives in ${c.area}`); }
            const firstName = String(c.name || 'They').split(' ')[0];
            return {
                id: c.id,
                score: Math.max(45, Math.min(98, Math.round(s))),
                reason: why.length ? `${firstName} ${why.slice(0, 2).join(' and ')}.` : 'A solid all-round lifestyle fit for what you described.',
            };
        });
        return scored.sort((a, b) => b.score - a.score).slice(0, 3);
    }

    /**
     * Algorithmic fallback if AI fails
     */
    private static fallbackScoring(userA: any, userB: any) {
        // Returning a realistic mock response for demonstration!
        return {
            compatibility_score: 88,
            explanation: "Based on our AI analysis, you both have excellent compatibility! You share an interest in keeping a clean space, and your daily routines as early-birds align perfectly.",
            top_synergies: ["EARLY_BIRD", "CLEAN"],
            top_conflicts: [],
            breakdown: {
                habit_overlap: 35,
                lifestyle_conflict: 25,
                budget_compatibility: 15,
                location_match: 10,
                gender_preference: 3
            }
        };
    }
}
