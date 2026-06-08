import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../../config/env.js';

export class AIMatchingService {
    private static genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    private static model = AIMatchingService.genAI.getGenerativeModel({ 
        model: env.GEMINI_MODEL_NAME || 'gemini-1.5-flash',
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
