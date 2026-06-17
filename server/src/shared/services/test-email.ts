import { emailService } from './email.service.js';
import env from '../../config/env.js';

async function main() {
    console.log('📧 Starting Email Service Integration Test...');
    console.log('Configuration Check:');
    console.log('- RESEND_API_KEY present:', !!env.RESEND_API_KEY);
    console.log('- SMTP_HOST:', env.SMTP_HOST);
    console.log('- SMTP_FROM_EMAIL:', env.SMTP_FROM_EMAIL);

    const recipient = process.argv[2] || 'yehiaheshamrasol2005@gmail.com';
    console.log(`Sending test verification email to: ${recipient}`);

    const success = await emailService.sendVerificationEmail(recipient, '987654');

    if (success) {
        console.log('✅ Test email sent successfully!');
    } else {
        console.error('❌ Test email sending failed.');
    }
}

main().catch(console.error);
