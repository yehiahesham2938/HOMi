import { v4 as uuidv4 } from 'uuid';
import sequelize from './config/database.js';
import { User, Profile, Habit, UserHabit } from './modules/auth/models/index.js';
import { RoommateRequest, RoommateRequestType, RoommateRequestStatus, PreferredGender } from './modules/roommate-matching/models/RoommateRequest.js';

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');

        // Mock candidates
        const candidates = [
            {
                email: 'ahmed.roommate@test.com',
                first_name: 'Ahmed',
                last_name: 'Hassan',
                gender: 'MALE',
                birthdate: '1998-05-10',
                habits: ['NON_SMOKER', 'EARLY_BIRD', 'CLEAN'],
                request: {
                    type: RoommateRequestType.SEARCH_ROOMMATE,
                    city: 'Alexandria',
                    area: 'Smouha',
                    budget_min: 4000,
                    budget_max: 4000,
                    preferred_gender: PreferredGender.ANY,
                    note: 'I have a nice 2BR in Smouha. Looking for a clean roommate.'
                }
            },
            {
                email: 'sara.roommate@test.com',
                first_name: 'Sara',
                last_name: 'Mostafa',
                gender: 'FEMALE',
                birthdate: '1995-11-20',
                habits: ['SMOKER', 'NIGHT_OWL', 'PET_OWNER'],
                request: {
                    type: RoommateRequestType.SEARCH_ROOMMATE,
                    city: 'Alexandria',
                    area: 'Smouha',
                    budget_min: 6000,
                    budget_max: 6000,
                    preferred_gender: PreferredGender.ANY,
                    note: 'Luxury apartment in Smouha, chill vibes. Must love cats!'
                }
            },
            {
                email: 'omar.roommate@test.com',
                first_name: 'Omar',
                last_name: 'Tarek',
                gender: 'MALE',
                birthdate: '2000-01-15',
                habits: ['NON_SMOKER', 'GYM_GOER', 'STUDENT'],
                request: {
                    type: RoommateRequestType.SEARCH_ROOMMATE,
                    city: 'Cairo',
                    area: 'Nasr City',
                    budget_min: 3000,
                    budget_max: 3000,
                    preferred_gender: PreferredGender.MALE,
                    note: 'Student at Al-Azhar, need a quiet study environment.'
                }
            }
        ];

        for (const c of candidates) {
            // Check if user exists
            let user = await User.findOne({ where: { email: c.email } });
            if (!user) {
                user = await User.create({
                    id: uuidv4(),
                    email: c.email,
                    password_hash: 'not-needed-for-seed',
                    role: 'TENANT',
                    is_verified: true,
                    status: 'ACTIVE'
                });
            }

            // Profile
            let profile = await Profile.findOne({ where: { user_id: user.id } });
            if (!profile) {
                profile = await Profile.create({
                    user_id: user.id,
                    first_name: c.first_name,
                    last_name: c.last_name,
                    phone_number: '+20100000' + Math.floor(1000 + Math.random() * 9000),
                    gender: c.gender,
                    birthdate: new Date(c.birthdate)
                } as any);
            }

            // Habits
            await UserHabit.destroy({ where: { user_id: user.id } });
            for (const h of c.habits) {
                let habit = await Habit.findOne({ where: { name: h } });
                if (!habit) {
                    habit = await Habit.create({ name: h });
                }
                await UserHabit.create({ user_id: user.id, habit_id: habit.id } as any);
            }

            // Roommate Request
            await RoommateRequest.destroy({ where: { user_id: user.id } });
            await RoommateRequest.create({
                user_id: user.id,
                type: c.request.type,
                status: RoommateRequestStatus.ACTIVE,
                preferred_city: c.request.city,
                preferred_area: c.request.area,
                budget_min: c.request.budget_min,
                budget_max: c.request.budget_max,
                preferred_gender: c.request.preferred_gender,
                additional_note: c.request.note
            } as any);

            console.log(`Created mock request for ${c.first_name}`);
        }

        console.log('Seeding complete!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
