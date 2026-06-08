import { adminService } from './modules/admin/services/admin.service.js';
import { TenantReport } from './modules/contracts/models/TenantReport.js';
import { User } from './modules/auth/models/User.js';
import sequelize from './config/database.js';

async function test() {
    try {
        await sequelize.authenticate();
        const report = await TenantReport.findOne();
        const admin = await User.findOne({ where: { role: 'ADMIN' } });
        if (!report || !admin) { console.log('No report or admin'); process.exit(1); }
        console.log('Testing with report:', report.id);
        await adminService.warnTenantFromReport(report.id, admin.id, 'Test warning message');
        console.log('Warn successful!');
    } catch (e: any) {
        console.error('Error name:', e.name);
        console.error('Error msg:', e.message);
        if (e.errors) console.error(e.errors);
    }
    process.exit(0);
}
test();
