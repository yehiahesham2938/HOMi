import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import env from '../../config/env.js';

/**
 * Email Service
 * Handles sending branded emails for HOMi platform
 */
class EmailService {
    private transporter: Transporter | null = null;
    private initialized = false;

    /**
     * Initialize the email transporter
     * Uses SMTP configuration from environment variables
     */
    private async initialize(): Promise<void> {
        if (this.initialized) return;

        // Check if SMTP credentials are configured
        if (!env.SMTP_USER || !env.SMTP_PASS) {
            console.log('📧 [EMAIL SERVICE] SMTP not configured - emails will be mocked to console');
            this.initialized = true;
            return;
        }

        try {
            this.transporter = nodemailer.createTransport({
                host: env.SMTP_HOST,
                port: env.SMTP_PORT,
                secure: env.SMTP_PORT === 465, // true for 465, false for other ports
                auth: {
                    user: env.SMTP_USER,
                    pass: env.SMTP_PASS,
                },
            });

            // Verify connection
            await this.transporter.verify();
            console.log('✅ [EMAIL SERVICE] SMTP connection established');
            this.initialized = true;
        } catch (error) {
            console.error('❌ [EMAIL SERVICE] Failed to initialize SMTP:', error);
            this.transporter = null;
            this.initialized = true;
        }
    }

    /**
     * Generate HOMI branded email template
     */
    private generateEmailTemplate(content: {
        title: string;
        message: string;
        buttonText?: string;
        buttonUrl?: string;
        footer?: string;
    }): string {
        const { title, message, buttonText, buttonUrl, footer } = content;

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f7fa;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
            padding: 40px 20px;
            text-align: center;
        }
        .header h1 {
            color: #ffffff;
            font-size: 36px;
            font-weight: 700;
            letter-spacing: 2px;
        }
        .header .tagline {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            margin-top: 8px;
        }
        .content {
            padding: 40px 30px;
        }
        .title {
            font-size: 24px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 20px;
        }
        .message {
            font-size: 16px;
            color: #475569;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .button-container {
            text-align: center;
            margin: 30px 0;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 16px 40px;
            border-radius: 50px;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
        }
        .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
        }
        .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
            margin: 30px 0;
        }
        .footer {
            background: #f8fafc;
            padding: 25px 30px;
            text-align: center;
        }
        .footer-text {
            font-size: 12px;
            color: #94a3b8;
            line-height: 1.5;
        }
        .footer-text a {
            color: #6366f1;
            text-decoration: none;
        }
        .social-links {
            margin-top: 15px;
        }
        .social-links a {
            display: inline-block;
            margin: 0 8px;
            color: #6366f1;
            text-decoration: none;
            font-size: 13px;
        }
        .note {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            border-radius: 0 8px 8px 0;
            margin-top: 20px;
        }
        .note p {
            font-size: 13px;
            color: #92400e;
            margin: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>HOMi</h1>
            <p class="tagline">Your Home, Your Way</p>
        </div>
        <div class="content">
            <h2 class="title">${title}</h2>
            <p class="message">${message}</p>
            ${buttonText && buttonUrl ? `
            <div class="button-container">
                <a href="${buttonUrl}" class="button">${buttonText}</a>
            </div>
            <div class="note">
                <p>If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${buttonUrl}" style="color: #6366f1; word-break: break-all;">${buttonUrl}</a></p>
            </div>
            ` : ''}
        </div>
        <div class="divider"></div>
        <div class="footer">
            <p class="footer-text">
                ${footer || "You're receiving this email because you have an account with HOMi."}
                <br><br>
                © ${new Date().getFullYear()} HOMi. All rights reserved.
                <br>
                <a href="${env.CLIENT_URL}">Visit HOMi</a>
            </p>
        </div>
    </div>
</body>
</html>
        `.trim();
    }

    /**
     * Generate plain text email for non-HTML clients
     */
    private generatePlainTextEmail(content: {
        title: string;
        message: string;
        buttonText?: string;
        buttonUrl?: string;
    }): string {
        let text = `HOMi - Your Home, Your Way\n\n`;
        text += `${content.title}\n`;
        text += `${'='.repeat(content.title.length)}\n\n`;
        text += `${content.message}\n\n`;

        if (content.buttonUrl) {
            text += `${content.buttonText || 'Click here'}: ${content.buttonUrl}\n\n`;
        }

        text += `---\n`;
        text += `© ${new Date().getFullYear()} HOMi. All rights reserved.\n`;

        return text;
    }

    /**
     * Send an email
     */
    private async sendEmail(to: string, subject: string, content: {
        title: string;
        message: string;
        buttonText?: string;
        buttonUrl?: string;
        footer?: string;
    }): Promise<boolean> {
        await this.initialize();

        const html = this.generateEmailTemplate(content);
        const text = this.generatePlainTextEmail(content);

        // If no transporter, mock the email
        if (!this.transporter) {
            console.log('\n📧 ═══════════════════════════════════════════════════════════');
            console.log('📧 [MOCK EMAIL] Sending email to:', to);
            console.log('📧 [MOCK EMAIL] Subject:', subject);
            console.log('📧 [MOCK EMAIL] Title:', content.title);
            console.log('📧 [MOCK EMAIL] Message:', content.message);
            if (content.buttonUrl) {
                console.log('📧 [MOCK EMAIL] Button:', content.buttonText, '->', content.buttonUrl);
            }
            console.log('📧 ═══════════════════════════════════════════════════════════\n');
            return true;
        }

        try {
            const result = await this.transporter.sendMail({
                from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
                to,
                subject,
                text,
                html,
            });

            console.log('✅ [EMAIL SERVICE] Email sent successfully:', result.messageId);
            return true;
        } catch (error) {
            console.error('❌ [EMAIL SERVICE] Failed to send email:', error);
            return false;
        }
    }

    /**
     * Send email verification email
     */
    async sendVerificationEmail(email: string, token: string): Promise<boolean> {
        const verificationUrl = `${env.CLIENT_URL}/verify-email?token=${token}`;
        // Also provide API endpoint for direct verification
        const apiVerificationUrl = `http://localhost:${env.PORT}/api/auth/verify-email?token=${token}`;

        console.log('📧 [EMAIL SERVICE] Verification API URL:', apiVerificationUrl);

        return this.sendEmail(email, 'Verify Your Email - HOMi', {
            title: 'Welcome to HOMi! 🏠',
            message: `
                Thank you for joining HOMi! We're excited to have you on board.
                <br><br>
                To complete your registration and unlock all features, please verify your email address by clicking the button below.
                <br><br>
                This verification link will expire in <strong>24 hours</strong>.
            `,
            buttonText: 'Verify My Email',
            buttonUrl: apiVerificationUrl,
            footer: "If you didn't create an account with HOMi, you can safely ignore this email.",
        });
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
        const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;

        return this.sendEmail(email, 'Reset Your Password - HOMi', {
            title: 'Password Reset Request',
            message: `
                We received a request to reset your password for your HOMi account.
                <br><br>
                Click the button below to set a new password. This link will expire in <strong>1 hour</strong>.
                <br><br>
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
            `,
            buttonText: 'Reset Password',
            buttonUrl: resetUrl,
            footer: "If you didn't request a password reset, please ignore this email or contact support if you're concerned.",
        });
    }

    /**
     * Send welcome email after successful verification
     */
    async sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
        return this.sendEmail(email, 'Welcome to HOMi! 🎉', {
            title: `Welcome, ${firstName}!`,
            message: `
                Your email has been verified successfully. You're now a fully verified member of HOMi! 🏠
                <br><br>
                Here's what you can do next:
                <br><br>
                <strong>For Tenants:</strong><br>
                • Browse available properties<br>
                • Save your favorites<br>
                • Connect with landlords
                <br><br>
                <strong>For Landlords:</strong><br>
                • List your properties<br>
                • Manage your listings<br>
                • Connect with potential tenants
                <br><br>
                Start exploring HOMi today!
            `,
            buttonText: 'Get Started',
            buttonUrl: env.CLIENT_URL,
        });
    }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
