import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

const FROM_EMAIL = 'noreply@contact.zadanoapp.com'

// Resend SMTP Configuration
const RESEND_HOST = 'smtp.resend.com'
const RESEND_PORT = 465
const RESEND_USER = 'resend'

// Lazy-loaded transporter
let transporter: Transporter | null = null

function getTransporter(): Transporter {
    if (transporter) return transporter

    const apiKey = process.env.RESEND_API_KEY

    if (!apiKey) {
        console.warn('⚠️ RESEND_API_KEY is missing. Emails will not be sent.')
    }

    console.log('📬 Creating Resend transporter')

    transporter = nodemailer.createTransport({
        host: RESEND_HOST,
        port: RESEND_PORT,
        secure: true, // true for 465, false for other ports
        auth: {
            user: RESEND_USER,
            pass: apiKey,
        },
    })

    return transporter
}

export interface SendOTPEmailOptions {
    to: string
    otp: string
    type: 'sign-in' | 'email-verification' | 'forget-password'
}

/**
 * Send OTP email using Mailtrap
 */
export async function sendOTPEmail({ to, otp, type }: SendOTPEmailOptions): Promise<void> {
    const transport = getTransporter()
    const subject = getSubject(type)
    const html = getEmailHtml(otp, type)

    try {
        const result = await transport.sendMail({
            from: FROM_EMAIL,
            to,
            subject,
            html,
        })
        console.log(`✅ OTP email sent to ${to} (${type})`, result.messageId)
    } catch (error) {
        console.error('❌ Failed to send OTP email:', error)
        throw error
    }
}

function getSubject(type: string): string {
    switch (type) {
        case 'sign-in':
            return 'Zadano.app - Your Login Code'
        case 'email-verification':
            return 'Zadano.app - Verify Your Email'
        case 'forget-password':
            return 'Zadano.app - Reset Your Password'
        default:
            return 'Zadano.app - Your Verification Code'
    }
}

function getEmailHtml(otp: string, type: string): string {
    const actionText = type === 'forget-password'
        ? 'reset your password'
        : type === 'email-verification'
            ? 'verify your email'
            : 'log in to your account'

    return `
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>Zadano.app OTP</title>
    <style>
        :root {
            color-scheme: light dark;
            supported-color-schemes: light dark;
        }
        body {
            margin: 0;
            padding: 0;
            word-spacing: normal;
            background-color: #0a0a0f;
        }
        div[style*="margin: 16px 0"] {
            margin: 0 !important;
        }
        /* Fixes for Outlook */
        table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        
        /* Hover effect for button fallback */
        .otp-container:hover {
            border-color: #fbbf24 !important;
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 0 auto; background-color: #15151d; border: 1px solid #2a2a3a; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.4);">
                    
                    <tr>
                        <td align="center" style="padding: 40px 40px 20px 40px;">
                            <img src="https://ui-avatars.com/api/?name=Z+A&background=f59e0b&color=fff&size=64&font-size=0.5&rounded=true" alt="Zadano.app Logo" width="64" height="64" style="display: block; width: 64px; height: 64px; border: 0; border-radius: 14px;">
                            <h1 style="margin: 20px 0 0 0; color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Zadano.app</h1>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 40px;">
                            <p style="margin: 0; color: #9ca3af; font-size: 16px; line-height: 1.6;">
                                Cześć! Użyj poniższego kodu, aby <span style="color: #e5e7eb;">${actionText}</span>.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 32px 40px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="background-color: #1f1f2e; border: 1px solid #3f3f50; border-radius: 12px; padding: 24px;">
                                        <span style="font-family: 'Courier New', Courier, monospace; color: #f59e0b; font-size: 36px; font-weight: 700; letter-spacing: 8px; display: block; line-height: 1;">
                                            ${otp}
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 40px 40px 40px;">
                            <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                                Ten kod wygasa za <strong>10 minut</strong>.<br>
                                Jeśli nie prosiłeś o ten kod, zignoruj tę wiadomość.
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td height="4" style="background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%); font-size: 0; line-height: 0;">&nbsp;</td>
                    </tr>

                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 0 auto;">
                    <tr>
                        <td align="center" style="padding-top: 24px;">
                            <p style="margin: 0; color: #4b5563; font-size: 12px;">
                                &copy; 2024 Zadano.app Inc. Wszelkie prawa zastrzeżone.<br>
                                <a href="#" style="color: #6b7280; text-decoration: underline;">Pomoc</a> &bull; <a href="#" style="color: #6b7280; text-decoration: underline;">Prywatność</a>
                            </p>
                        </td>
                    </tr>
                </table>

                </td>
        </tr>
    </table>
</body>
</html>
`
}
