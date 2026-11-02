const crypto = require('crypto');

// Hàm format thời gian theo chuẩn Pay2Pay (YYYYMMDDHHMMSS - Múi giờ UTC+7)
function getFormattedTime() {
    const date = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

function formatReturnUrl(url) {
    // Luôn sử dụng URL chuẩn không chứa dấu thăng '#' vì các validator URL của backend (Spring Boot) sẽ báo lỗi 400
    if (!url) return 'https://pay2pay-paygate-developer.vercel.app/';
    const clean = url.split('?')[0].split('#')[0];
    return clean || 'https://pay2pay-paygate-developer.vercel.app/';
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
        let lastLoginStatus = accessToken ? 200 : null;
        let lastLoginText = accessToken ? 'Using cached token' : null;

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

                lastLoginStatus = loginRes.status;
                lastLoginText = await loginRes.text();
                let loginData = {};
                try { loginData = lastLoginText ? JSON.parse(lastLoginText) : {}; } catch(e) {}
                
                if (loginRes.ok && loginData.code === 'SUCCESS' && loginData.data?.accessToken) {
                    cachedAccessToken = loginData.data.accessToken;
                    const expireSeconds = parseInt(loginData.data.expireIn, 10) || 600;
                    tokenExpiresAt = Date.now() + Math.max(60, expireSeconds - 60) * 1000;
                    accessToken = cachedAccessToken;
                    console.log('[Pay2Pay] Lấy Access Token thành công');
                } else {
                    console.warn('[Pay2Pay Login Thất bại]', loginRes.status, lastLoginText);
                }
            } catch (loginErr) {
                lastLoginText = 'Login Err: ' + loginErr.message;
                console.warn('[Pay2Pay Login Timeout/Error]:', loginErr.message);
            }
        }

        // ========================================================
        // BƯỚC 2: GỌI API INIT PAYMENT THEO CHUẨN PAY2PAY REDIRECT 2.0
        // ========================================================
        const authHeader = accessToken ? `Bearer ${accessToken}` : '';
        const cleanOrderId = String(orderId).replace(/[^a-zA-Z0-9_-]/g, '');
        const cleanDesc = (description || `Thanhtoandonhang${cleanOrderId}`)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'D')
            .replace(/[^a-zA-Z0-9]/g, '')
            .trim();

        // Hàm tạo chữ ký theo chuẩn Pay2Pay (hỗ trợ cả có và không có authHeader)
        const buildSignature = (authH, rId, rTime, tenant, bodyObj) => {
            const prefix = authH ? `${authH}` : '';
            const payload = `${prefix}${rId}${rTime}${tenant}${JSON.stringify(bodyObj)}`;
            const sign = crypto.createSign('SHA256');
            sign.update(payload);
            sign.end();
            return sign.sign(PRIVATE_KEY, 'base64');
        };

        let paymentUrl = null;
        let initRes = null;
        let initText = '';
        let initData = {};
        let attemptedStrategies = [];

        // --------------------------------------------------------
        // PHẦN 2.1: GỌI API Hosted Checkout (/pgw-transaction-service/paymentpage/api/v1.0/init)
        // Theo Mục V.3 của Tài liệu tích hợp dịch vụ thanh toán redirect (API) V2.0 – 2026
        // --------------------------------------------------------
        const paymentpageStrategies = [
            // Chiến lược A: Theo ví dụ cURL trong tài liệu V.3 (p-tenant: PAYMENT-SITE)
            {
                name: 'paymentpage_payment_site',
                endpoint: `${PAY2PAY_API_URL}/pgw-transaction-service/paymentpage/api/v1.0/init`,
                tenant: 'PAYMENT-SITE',
                useAuth: false,
                body: {
                    merchantId: MERCHANT_ID,
                    amount: String(amount),
                    orderId: orderId,
                    currency: "VND",
                    paymentMethod: "",
                    description: cleanDesc,
                    lang: "vi",
                    returnUrl: targetReturnUrl,
                    paymentFee: 0
                }
            },
            // Chiến lược B: Theo bảng thông số V.3 (p-tenant: MERCHANT-WEB, kèm Authorization và chữ ký auth)
            {
                name: 'paymentpage_merchant_web_auth',
                endpoint: `${PAY2PAY_API_URL}/pgw-transaction-service/paymentpage/api/v1.0/init`,
                tenant: TENANT,
                useAuth: true,
                body: {
                    merchantId: MERCHANT_ID,
                    merchant_id: MERCHANT_ID,
                    amount: String(amount),
                    orderId: orderId,
                    currency: "VND",
                    paymentMethod: "",
                    description: cleanDesc,
                    lang: "vi",
                    returnUrl: targetReturnUrl,
                    return_url: targetReturnUrl,
                    paymentFee: 0
                }
            }
        ];

        for (const strat of paymentpageStrategies) {
            if (paymentUrl) break;
            try {
                const reqId = crypto.randomUUID();
                const reqTime = getFormattedTime();
                const authH = strat.useAuth ? authHeader : '';
                const sig = buildSignature(authH, reqId, reqTime, strat.tenant, strat.body);

                const reqHeaders = {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'p-tenant': strat.tenant,
                    'p-request-id': reqId,
                    'p-request-time': reqTime,
                    'p-signature': sig
                };
                if (strat.useAuth && accessToken) {
                    reqHeaders['Authorization'] = authHeader;
                }

                initRes = await fetch(strat.endpoint, {
                    method: 'POST',
                    signal: AbortSignal.timeout(4000),
                    headers: reqHeaders,
                    body: JSON.stringify(strat.body)
                });

                initText = await initRes.text();
                try { initData = initText ? JSON.parse(initText) : {}; } catch(e) { initData = {}; }

                attemptedStrategies.push({ 
                    name: strat.name, 
                    status: initRes.status, 
                    code: initData.code || null,
                    message: initData.message || null
                });

                if (initRes.ok && (initData.code === 'SUCCESS' || initData.data?.paymentUrl || initData.data?.payment_url)) {
                    paymentUrl = initData.data?.paymentUrl || initData.data?.payment_url || initData.data?.redirectUrl;
                    if (paymentUrl) {
                        console.log(`[Pay2Pay PaymentPage Init] Thành công với ${strat.name}! URL:`, paymentUrl);
                        break;
                    }
                }
            } catch (err) {
                attemptedStrategies.push({ name: strat.name, error: err.message });
            }
        }

        // --------------------------------------------------------
        // PHẦN 2.2: NẾU PAYMENTPAGE CHƯA TRẢ VỀ URL, GỌI API MCH INITIALIZE V1.0
        // Khởi tạo giao dịch qua cổng Pay2Pay và nhận txnId -> URL Redirect 2.0 (uat-checkout.pay2pay.vn/v2/{txnId})
        // --------------------------------------------------------
        if (!paymentUrl && accessToken) {
            const mchTenants = ['KING01', TENANT];
            for (const tenantCandidate of mchTenants) {
                if (paymentUrl) break;
                try {
                    const mchReqId = crypto.randomUUID();
                    const mchTime = getFormattedTime();
                    const mchBody = {
                        currency: "VND",
                        issuerId: "PAYGATE",
                        command: "PAY",
                        paymentMethod: "QRBANK",
                        merchantData: {
                            orderId: orderId,
                            orderDesc: cleanDesc,
                            amount: Number(amount),
                            returnUrl: targetReturnUrl
                        }
                    };

                    const sigMch = buildSignature(authHeader, mchReqId, mchTime, tenantCandidate, mchBody);

                    const mchRes = await fetch(`${PAY2PAY_API_URL}/pgw-transaction-service/mch/api/v1.0/initialize`, {
                        method: 'POST',
                        signal: AbortSignal.timeout(6000),
                        headers: {
                            'Content-Type': 'application/json',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'application/json, text/plain, */*',
                            'Authorization': authHeader,
                            'p-request-id': mchReqId,
                            'p-request-time': mchTime,
                            'p-tenant': tenantCandidate,
                            'p-signature': sigMch
                        },
                        body: JSON.stringify(mchBody)
                    });

                    const mchText = await mchRes.text();
                    let mchData = {};
                    try { mchData = mchText ? JSON.parse(mchText) : {}; } catch(e) {}

                    attemptedStrategies.push({ 
                        name: `MCH initialize (${tenantCandidate})`, 
                        status: mchRes.status, 
                        code: mchData.code || null,
                        message: mchData.message || null
                    });

                    if (mchRes.ok && mchData.code === 'SUCCESS') {
                        const txnId = mchData.data?.txnId;
                        if (txnId) {
                            paymentUrl = `https://uat-checkout.pay2pay.vn/v2/${txnId}`;
                            console.log(`[Pay2Pay Redirect 2.0 via MCH] Thành công với txnId: ${txnId}, URL: ${paymentUrl}`);
                            break;
                        }
                    }
                } catch (mchErr) {
                    attemptedStrategies.push({ name: `MCH initialize (${tenantCandidate})`, error: mchErr.message });
                }
            }
        }

        // ========================================================
        // BƯỚC 3: TRẢ VỀ KẾT QUẢ CHO TRÌNH DUYỆT ĐIỀU HƯỚNG SANG PAY2PAY
        // ========================================================
        if (paymentUrl) {
            console.log('[Pay2Pay Checkout 2.0 Thành công] Sẵn sàng điều hướng:', paymentUrl);
            return res.status(200).json({ 
                success: true, 
                paymentUrl: paymentUrl,
                orderId: orderId,
                amount: amount
            });
        }

        // NẾU TẤT CẢ ENDPOINT KHÔNG THÀNH CÔNG: Ghi log chi tiết và trả về phản hồi
        console.error('[Pay2Pay Redirect 2.0 Init Thất bại]:', attemptedStrategies);
        return res.status(200).json({ 
            success: false, 
            message: initData.message || 'Cổng thanh toán Pay2Pay Redirect 2.0 từ chối khởi tạo giao dịch.',
            code: initData.code || (initRes ? `HTTP_${initRes.status}` : 'INIT_FAILED'),
            data: initData,
            debug: {
                loginStatus: lastLoginStatus,
                loginSuccess: !!accessToken,
                attemptedStrategies: attemptedStrategies
            }
        });

    } catch (error) {
        console.error('[Lỗi Serverless Pay2Pay]:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Lỗi máy chủ kết nối API Pay2Pay: ' + (error.message || error.toString())
        });
    }
}
