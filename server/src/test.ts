import { User } from './modules/auth/models/User.js';
import { Notification } from './modules/notifications/models/Notification.js';
import sequelize from './config/database.js';

async function test() {
    try {
        await sequelize.authenticate();
        const user = await User.findOne();
        if (!user) { console.log('No user'); process.exit(1); }
        await Notification.create({
            user_id: user.id,
            title: 'Test',
            body: 'Test body',
            type: 'SYSTEM',
            is_read: false,
        } as any);
        console.log('Notification created successfully');
    } catch (e: any) {
        console.error('Error name:', e.name);
        console.error('Error msg:', e.message);
        if (e.errors) console.error(e.errors);
    }
    process.exit(0);
}
test();
