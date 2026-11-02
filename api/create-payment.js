const crypto = require('crypto');

// Hàm format thời gian theo chuẩn Pay2Pay (YYYYMMDDHHMMSS - Múi giờ UTC+7)
function getFormattedTime() {
    const date = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

function formatReturnUrl(url) {
    const defaultUrl = 'https://viethoang99.github.io/pay2pay-paygate-developer/#payment-result';
    if (!url) return defaultUrl;
    const clean = url.split('?')[0];
    if (clean.includes('#payment-result')) return clean;
    return clean.split('#')[0] + '#payment-result';
}

let cachedAccessToken = null;
let tokenExpiresAt = 0;

export default async function handler(req, res) {
    // 1. CẤU HÌNH CORS CHO PHÉP FRONTEND (GITHUB PAGES, LOCALHOST, VERCEL) GỌI API AN TOÀN
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, p-request-id, p-tenant, p-signature');

    // Xử lý Preflight Request (OPTIONS) từ trình duyệt
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Chỉ chấp nhận method POST cho tạo yêu cầu thanh toán
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    try {
        const body = req.body || {};
        const orderId = body.orderId || ('ORD-' + Date.now().toString(36).toUpperCase());
        const amount = body.amount || '100000';
        const description = body.description || `Thanh toán đơn hàng ${orderId}`;
        const targetReturnUrl = formatReturnUrl(body.returnUrl);

        // 2. LẤY CẤU HÌNH BIẾN MÔI TRƯỜNG TỪ VERCEL
        const PAY2PAY_API_URL = process.env.PAY2PAY_API_URL || 'https://uat-api.pay2pay.vn';
        const USERNAME = process.env.PAY2PAY_USERNAME;
        const PASSWORD = process.env.PAY2PAY_PASSWORD; 
        const TENANT = process.env.PAY2PAY_TENANT || 'MERCHANT-WEB';
        const MERCHANT_ID = process.env.PAY2PAY_MERCHANT_ID || 'PP0000141001';
        let PRIVATE_KEY = process.env.PAY2PAY_PRIVATE_KEY;
        
        // Nếu chưa cài đặt biến môi trường trên Vercel
        if (!PRIVATE_KEY || !USERNAME || !PASSWORD) {
            console.warn('[Pay2Pay] Thiếu biến môi trường PAY2PAY_PRIVATE_KEY, PAY2PAY_USERNAME hoặc PAY2PAY_PASSWORD');
            return res.status(200).json({ 
                success: false, 
                message: "Hệ thống chưa cấu hình biến môi trường kết nối Pay2Pay trên máy chủ Vercel.",
                code: "MISSING_ENV_CREDENTIALS"
            });
        }
        
        // Chuẩn hóa định dạng RSA Private Key (xử lý newline khi paste trên Vercel)
        PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, '\n');
        if (PRIVATE_KEY.split('\n').length <= 2) {
            let keyBody = PRIVATE_KEY.replace(/-----BEGIN (RSA )?PRIVATE KEY-----/, '')
                                     .replace(/-----END (RSA )?PRIVATE KEY-----/, '')
                                     .replace(/\s+/g, '');
            let formattedBody = '';
            for (let i = 0; i < keyBody.length; i += 64) {
                formattedBody += keyBody.substring(i, i + 64) + '\n';
            }
            const isRSA = PRIVATE_KEY.includes('RSA');
            const header = isRSA ? '-----BEGIN RSA PRIVATE KEY-----' : '-----BEGIN PRIVATE KEY-----';
            const footer = isRSA ? '-----END RSA PRIVATE KEY-----' : '-----END PRIVATE KEY-----';
            PRIVATE_KEY = `${header}\n${formattedBody}${footer}`;
        }

        // Hàm tạo chữ ký RSA-2048 SHA256
        const generateSignature = (rId, rTime, tenant, bodyObj) => {
            const payloadToSign = `${rId}${rTime}${tenant}${JSON.stringify(bodyObj)}`;
            const sign = crypto.createSign('SHA256');
            sign.update(payloadToSign);
            sign.end();
            return sign.sign(PRIVATE_KEY, 'base64');
        };

        // Mã hóa Password theo chuẩn Pay2Pay: base64(hex(sha256(username + rawPassword)))
        const rawPassword = PASSWORD;
        let hashedPassword = rawPassword;
        if (rawPassword.length !== 88) {
            const inputString = USERNAME + rawPassword;
            const sha256Hex = crypto.createHash('sha256').update(inputString).digest('hex');
            hashedPassword = Buffer.from(sha256Hex).toString('base64');
        }

        // ========================================================
        // BƯỚC 1: LẤY HOẶC TÁI SỬ DỤNG ACCESS TOKEN (API V.1 LOGIN)
        // ========================================================
        let accessToken = cachedAccessToken;
        if (!accessToken || Date.now() > tokenExpiresAt) {
            try {
                const loginReqId = crypto.randomUUID();
                const loginTime = getFormattedTime();
                const loginBody = { username: USERNAME, password: hashedPassword };
                const loginSig = generateSignature(loginReqId, loginTime, TENANT, loginBody);

                const loginRes = await fetch(`${PAY2PAY_API_URL}/auth-service/api/v1.0/user/login`, {
                    method: 'POST',
                    signal: AbortSignal.timeout(7000),
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'application/json, text/plain, */*',
                        'p-request-id': loginReqId,
                        'p-request-time': loginTime,
                        'p-tenant': TENANT,
                        'p-signature': loginSig
                    },
                    body: JSON.stringify(loginBody)
                });

                const loginText = await loginRes.text();
                let loginData = {};
                try { loginData = loginText ? JSON.parse(loginText) : {}; } catch(e) {}
                
                if (loginRes.ok && loginData.code === 'SUCCESS' && loginData.data?.accessToken) {
                    cachedAccessToken = loginData.data.accessToken;
                    const expireSeconds = parseInt(loginData.data.expireIn, 10) || 600;
                    tokenExpiresAt = Date.now() + Math.max(60, expireSeconds - 60) * 1000;
                    accessToken = cachedAccessToken;
                    console.log('[Pay2Pay] Lấy Access Token thành công');
                } else {
                    console.warn('[Pay2Pay Login Thất bại]', loginRes.status, loginText);
                }
            } catch (loginErr) {
                console.warn('[Pay2Pay Login Timeout/Error]:', loginErr.message);
            }
        }

        // ========================================================
        // BƯỚC 2: GỌI API INIT PAYMENT (API V.3 Hosted Checkout)
        // ========================================================
        const initReqId = crypto.randomUUID();
        const initTime = getFormattedTime();
        const cleanOrderId = String(orderId).replace(/[^a-zA-Z0-9_-]/g, '');

        const initBody = {
            merchantId: MERCHANT_ID,
            merchant_id: MERCHANT_ID,
            amount: String(amount),
            orderId: orderId,
            currency: "VND",
            paymentMethod: "",
            description: description || `Thanhtoanchodonhang${cleanOrderId}`,
            lang: "vi",
            returnUrl: targetReturnUrl,
            return_url: targetReturnUrl,
            paymentFee: 0
        };

        const initSig = generateSignature(initReqId, initTime, TENANT, initBody);

        const initHeaders = {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'p-request-id': initReqId,
            'p-request-time': initTime,
            'p-tenant': TENANT,
            'p-signature': initSig
        };

        if (accessToken) {
            initHeaders['Authorization'] = `Bearer ${accessToken}`;
        }

        const initRes = await fetch(`${PAY2PAY_API_URL}/pgw-transaction-service/paymentpage/api/v1.0/init`, {
            method: 'POST',
            signal: AbortSignal.timeout(7000),
            headers: initHeaders,
            body: JSON.stringify(initBody)
        });

        const initText = await initRes.text();
        let initData = {};
        try { initData = initText ? JSON.parse(initText) : {}; } catch(e) {}
        
        let paymentUrl = null;
        if (initRes.ok && initData.code === 'SUCCESS') {
            paymentUrl = initData.data?.paymentUrl || initData.data?.payment_url || initData.data?.redirectUrl;
        }

        // NẾU CỔNG PAY2PAY TRẢ VỀ LINK THANH TOÁN THÀNH CÔNG -> TRẢ VỀ CHO FRONTEND REDIRECT
        if (paymentUrl) {
            console.log('[Pay2Pay Init Thành công] paymentUrl:', paymentUrl);
            return res.status(200).json({ 
                success: true, 
                paymentUrl: paymentUrl,
                orderId: orderId,
                amount: amount
            });
        }

        // NẾU KHÔNG THÀNH CÔNG: Ghi log chi tiết và trả về phản hồi chính xác
        console.error('[Pay2Pay Init Thất bại]:', initRes.status, initText);
        return res.status(200).json({ 
            success: false, 
            message: initData.message || 'Cổng thanh toán Pay2Pay từ chối khởi tạo giao dịch.',
            code: initData.code || `HTTP_${initRes.status}`,
            data: initData
        });

    } catch (error) {
        console.error('[Lỗi Serverless Pay2Pay]:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Lỗi máy chủ kết nối API Pay2Pay: ' + (error.message || error.toString())
        });
    }
}
