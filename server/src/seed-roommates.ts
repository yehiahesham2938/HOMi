import { randomUUID as uuidv4 } from 'node:crypto';
import sequelize from './config/database.js';
import { User, Profile } from './modules/auth/models/index.js';
import { RoommateRequest, RoommateRequestType, RoommateRequestStatus, PreferredGender } from './modules/roommate-matching/models/RoommateRequest.js';

/**
 * Seeds a pool of roommate candidates with structured lifestyle habits and
 * active "search for apartment" requests so Smart Match and HOMI Wish have data.
 * Habit dimensions (0/1/2): sleep, clean, social, noise, smoke, pets, cook, work.
 */
async function seed() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');

        const candidates = [
            {
                email: 'kareem.roommate@test.com', first_name: 'Kareem', last_name: 'Adel', gender: 'MALE', birthdate: '2002-03-12',
                bio: 'Software engineer who works from home most days. I keep my space spotless, sleep late, and love a quiet flat to focus. Looking for a calm, respectful roommate near Maadi.',
                lifestyle: { sleep: 2, clean: 2, social: 1, noise: 0, smoke: 0, pets: 1, cook: 1, work: 2 },
                request: { city: 'Cairo', area: 'Maadi', budget_min: 6500, budget_max: 9000, gender: PreferredGender.ANY, move_in: '2026-07-01' },
            },
            {
                email: 'omar.roommate@test.com', first_name: 'Omar', last_name: 'Hany', gender: 'MALE', birthdate: '2000-08-05',
                bio: 'Pharmacist on rotating shifts. Tidy, non-smoker, occasional weekend guests. I cook a lot and would happily share meals. Easygoing and clean.',
                lifestyle: { sleep: 1, clean: 2, social: 2, noise: 1, smoke: 0, pets: 0, cook: 2, work: 0 },
                request: { city: 'Cairo', area: 'Nasr City', budget_min: 5000, budget_max: 7500, gender: PreferredGender.ANY, move_in: '2026-08-01' },
            },
            {
                email: 'mohy.roommate@test.com', first_name: 'Mohy', last_name: 'Eldin', gender: 'MALE', birthdate: '2003-01-22',
                bio: 'Designer, hybrid schedule. Night owl, fairly tidy, no pets but pet-friendly. I value a quiet home in the evenings and a roommate who respects shared space.',
                lifestyle: { sleep: 2, clean: 2, social: 1, noise: 0, smoke: 0, pets: 1, cook: 1, work: 1 },
                request: { city: 'Cairo', area: 'Maadi', budget_min: 7000, budget_max: 10000, gender: PreferredGender.ANY, move_in: '2026-07-01' },
            },
            {
                email: 'haneen.roommate@test.com', first_name: 'Haneen', last_name: 'Sami', gender: 'FEMALE', birthdate: '2001-06-18',
                bio: 'Marketing lead, very social and lively. Loves hosting friends, cooks daily, has a cat. Looking for an outgoing roommate who enjoys a vibrant home.',
                lifestyle: { sleep: 1, clean: 1, social: 2, noise: 2, smoke: 0, pets: 2, cook: 2, work: 0 },
                request: { city: 'Cairo', area: 'Zamalek', budget_min: 8000, budget_max: 12000, gender: PreferredGender.FEMALE, move_in: '2026-09-01' },
            },
            {
                email: 'nour.roommate@test.com', first_name: 'Nour', last_name: 'Adham', gender: 'FEMALE', birthdate: '1999-11-30',
                bio: 'Analyst working from home. Quiet, spotless, early riser, non-smoker, no pets. I rarely host and prefer a peaceful, focused environment near Maadi.',
                lifestyle: { sleep: 0, clean: 2, social: 0, noise: 0, smoke: 0, pets: 0, cook: 1, work: 2 },
                request: { city: 'Cairo', area: 'Maadi', budget_min: 6000, budget_max: 8500, gender: PreferredGender.FEMALE, move_in: '2026-07-01' },
            },
            {
                email: 'sara.roommate@test.com', first_name: 'Sara', last_name: 'Galal', gender: 'FEMALE', birthdate: '2002-02-14',
                bio: 'Medical student — long quiet study nights. Spotless, non-smoker, no pets, very rarely host. Need a calm flatmate who respects study hours.',
                lifestyle: { sleep: 2, clean: 2, social: 0, noise: 0, smoke: 0, pets: 0, cook: 1, work: 2 },
                request: { city: 'Cairo', area: 'Maadi', budget_min: 6500, budget_max: 9000, gender: PreferredGender.FEMALE, move_in: '2026-07-01' },
            },
            {
                email: 'adham.roommate@test.com', first_name: 'Adham', last_name: 'Reda', gender: 'MALE', birthdate: '2001-09-09',
                bio: 'Sales manager, often out. Lively, loves guests and music, cooks on weekends, pet-friendly. Looking for a social, fun household.',
                lifestyle: { sleep: 1, clean: 1, social: 2, noise: 2, smoke: 0, pets: 1, cook: 1, work: 0 },
                request: { city: 'Cairo', area: 'Heliopolis', budget_min: 7000, budget_max: 10000, gender: PreferredGender.ANY, move_in: '2026-09-01' },
            },
        ];

        for (const c of candidates) {
            let user = await User.findOne({ where: { email: c.email } });
            if (!user) {
                user = await User.create({
                    id: uuidv4(),
                    email: c.email,
                    password_hash: 'not-needed-for-seed',
                    role: 'TENANT',
                    is_verified: true,
                    status: 'ACTIVE',
                } as any);
            }

            let profile = await Profile.findOne({ where: { user_id: user.id } });
            const profileData = {
                first_name: c.first_name,
                last_name: c.last_name,
                gender: c.gender,
                birthdate: new Date(c.birthdate),
                bio: c.bio,
                national_id: '20000000000000',
                lifestyle_habits: c.lifestyle,
                preferred_budget_min: c.request.budget_min,
                preferred_budget_max: c.request.budget_max,
            };
            if (!profile) {
                profile = await Profile.create({
                    user_id: user.id,
                    phone_number: '+20100000' + Math.floor(1000 + Math.random() * 9000),
                    ...profileData,
                } as any);
            } else {
                await profile.update(profileData as any);
            }

            await RoommateRequest.destroy({ where: { user_id: user.id } });
            await RoommateRequest.create({
                user_id: user.id,
                type: RoommateRequestType.SEARCH_APARTMENT,
                status: RoommateRequestStatus.ACTIVE,
                preferred_city: c.request.city,
                preferred_area: c.request.area,
                budget_min: c.request.budget_min,
                budget_max: c.request.budget_max,
                preferred_gender: c.request.gender,
                preferred_move_in_date: c.request.move_in,
                additional_note: c.bio,
            } as any);

            console.log(`Seeded candidate ${c.first_name} ${c.last_name}`);
        }

        console.log('Seeding complete!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
