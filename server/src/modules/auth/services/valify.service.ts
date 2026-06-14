/**
 * Valify OCR Service
 * Proxies Egyptian National ID scanning through the backend so credentials
 * (client_id / client_secret) never reach the browser.
 *
 * Base URL: https://www.valifystage.com
 * Token:    POST /api/o/token/   (Django OAuth Toolkit, password grant)
 * OCR:      POST /api/v1.5/ocr/
 */

import axios from 'axios';

const VALIFY_BASE = 'https://www.valifystage.com';

// ── Credentials (server-side only, never sent to the browser) ──────────────
const VALIFY_USERNAME      = 'homi__37209_integration_bundle';
const VALIFY_PASSWORD      = 'w7aKEt5TGvxvCV2D';
const VALIFY_CLIENT_ID     = 'EEpDlk9c0iXuMrsDqCcXapdmZaoPpWOsXE2Gka9P';
const VALIFY_CLIENT_SECRET =
    '1rqQewT3lb1Gtj2vYL1MlPbGyitT6fPOlyrMhVYC0jECI14Kak5zi2ywBSVGSPDawUuPO5JabiE2Nueq27uU5FneYJY7XvVqI8IzgAYQ4WliojduQJDWLibAinAnXAiQ';
// bundle_key is different from username — see Postman collection
const VALIFY_BUNDLE_KEY    = '7dd9c800b4d143a394e6f5c245eebcd1';

// -----------------------------------------------------------------
// Types
// -----------------------------------------------------------------

interface ValifyTokenResponse {
    access_token: string;
    token_type:   string;
    expires_in?:  number;
    scope?:       string;
}

export interface ValifyOcrResult {
    result: {
        first_name:       string;
        full_name:        string;
        street:           string;
        front_nid:        string;
        serial_number:    string;
        back_nid:         string;
        release_date:     string;
        gender:           string;
        marital_status:   string;
        profession:       string;
        religion:         string;
        husband_name:     string;
        date_of_birth:    string;
        age:              number;
        birth_governarate:string;
        police_station:   string;
        governorate:      string;
        expiry_date:      string;
    };
    advanced_confidence: {
        is_face_fraud_detected: boolean;
    };
    document_verification_plus: {
        expired:             boolean;
        front_data_validity: boolean;
        back_data_validity:  boolean;
        is_front_greyscale:  boolean;
        is_back_greyscale:   boolean;
    };
    profession_analysis: {
        workplace:                string;
        profession_categorization:string;
    };
    document_liveness: {
        is_front_document_live: boolean;
        front_document_format:  string;
        is_back_document_live:  boolean;
        back_document_format:   string;
    };
    transaction_id:    string;
    trials_remaining:  number;
}

// -----------------------------------------------------------------
// Token cache — reuse tokens until 5 min before expiry
// -----------------------------------------------------------------

let _cachedToken:    string | null = null;
let _tokenExpiresAt: number        = 0;   // epoch ms

async function getAccessToken(): Promise<string> {
    if (_cachedToken && Date.now() < _tokenExpiresAt) {
        return _cachedToken;
    }

    // Correct endpoint from Valify Postman collection: /api/o/token/
    const params = new URLSearchParams({
        grant_type:    'password',
        username:      VALIFY_USERNAME,
        password:      VALIFY_PASSWORD,
        client_id:     VALIFY_CLIENT_ID,
        client_secret: VALIFY_CLIENT_SECRET,
    });

    console.log('[Valify] Fetching new access token…');

    const resp = await axios.post<ValifyTokenResponse>(
        `${VALIFY_BASE}/api/o/token/`,
        params.toString(),
        {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 20_000,
        }
    );

    const { access_token, expires_in } = resp.data;
    if (!access_token) throw new Error('Valify returned no access_token');

    _cachedToken    = access_token;
    // cache for expires_in minus 5 min safety margin (default 55 min if server doesn't specify)
    const ttlMs     = ((expires_in ?? 3600) - 300) * 1000;
    _tokenExpiresAt = Date.now() + ttlMs;

    console.log(`[Valify] Token acquired, valid for ~${Math.round(ttlMs / 60000)} min`);
    return access_token;
}

// -----------------------------------------------------------------
// Main OCR call
// -----------------------------------------------------------------

/**
 * Perform Egyptian NID OCR via Valify.
 * @param frontImg  Base64 JPEG/PNG of the front of the ID (with or without data-URL prefix)
 * @param backImg   Base64 JPEG/PNG of the back of the ID (with or without data-URL prefix)
 */
export async function performNidOcr(
    frontImg: string,
    backImg:  string,
): Promise<ValifyOcrResult> {
    // Strip data-URL prefix if accidentally present
    const strip = (s: string) => s.replace(/^data:image\/[a-zA-Z+]+;base64,/, '').trim();

    const token = await getAccessToken();

    console.log('[Valify] Calling OCR endpoint…');

    const resp = await axios.post<ValifyOcrResult>(
        `${VALIFY_BASE}/api/v1.5/ocr/`,
        {
            document_type: 'egy_nid',
            data: {
                bundle_key: VALIFY_BUNDLE_KEY,
                front_img:  strip(frontImg),
                back_img:   strip(backImg),
                lang:       'ar',
                extras: [
                    'advanced_confidence',
                    'document_verification_plus',
                ],
            },
        },
        {
            headers: {
                'Content-Type': 'application/json',
                Authorization:  `Bearer ${token}`,
            },
            timeout: 90_000,  // Stage server can be slow — 90 s ceiling
        }
    );

    console.log(`[Valify] OCR success, transaction_id=${resp.data.transaction_id}`);
    return resp.data;
}
