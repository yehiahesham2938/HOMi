import { AIMatchingService } from './modules/roommate-matching/services/ai-matching.service.js';

async function testMockAI() {
    console.log('--- Setting up AI Matcher Mock ---');

    // Monkey-patch the GoogleGenerativeAI model to return a simulated response
    // as if it were actual Gemini processing the prompt.
    const mockModel = (AIMatchingService as any).model;
    
    mockModel.generateContent = async (prompt: string) => {
        console.log('🤖 AI Engine Received Prompt!');
        console.log('--- Processing Profiles ---');
        
        // Mock a perfect JSON response from the Gemini AI
        const mockJsonResponse = {
            compatibility_score: 88,
            explanation: "You both have an excellent compatibility! You share an interest in keeping a clean space, and both of your routines as early-birds align perfectly. Budget and location also match.",
            top_synergies: ["EARLY_BIRD", "CLEAN", "NON_SMOKER"],
            top_conflicts: [],
            breakdown: {
                habit_overlap: 35,
                lifestyle_conflict: 25,
                budget_compatibility: 15,
                location_match: 10,
                gender_preference: 3
            }
        };

        return {
            response: {
                text: () => JSON.stringify(mockJsonResponse)
            }
        };
    };

    const userA = {
        name: 'Kareem',
        gender: 'MALE',
        habits: ['EARLY_BIRD', 'CLEAN', 'NON_SMOKER'],
        budget: 4500,
        city: 'Alexandria'
    };

    const userB = {
        name: 'Ahmed',
        gender: 'MALE',
        habits: ['EARLY_BIRD', 'CLEAN', 'NON_SMOKER'],
        budget: 4500,
        city: 'Alexandria'
    };

    console.log('\n--- Running AI Matching Service ---');
    const result = await AIMatchingService.scoreCompatibility(userA, userB);

    console.log('\n✅ AI Match Result Received!');
    console.log(JSON.stringify(result, null, 2));
}

testMockAI().catch(console.error);
