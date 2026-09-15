const crypto = require('crypto');

// Hàm format thời gian theo chuẩn Pay2Pay (YYYYMMDDHHMMSS - Múi giờ UTC+7)
function getFormattedTime() {
    const date = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

export default async function handler(req, res) {
    // Chỉ chấp nhận method POST từ Frontend
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { orderId, amount, description, returnUrl } = req.body;

        // 1. LẤY THÔNG TIN TỪ KÉT SẮT CỦA VERCEL (Environment Variables)
        const PAY2PAY_API_URL = process.env.PAY2PAY_API_URL || 'https://uat-api.pay2pay.vn';
        const USERNAME = process.env.PAY2PAY_USERNAME;
        const PASSWORD = process.env.PAY2PAY_PASSWORD; 
        const TENANT = process.env.PAY2PAY_TENANT || 'MERCHANT-WEB';
        const MERCHANT_ID = process.env.PAY2PAY_MERCHANT_ID;
        
        let PRIVATE_KEY = process.env.PAY2PAY_PRIVATE_KEY;
        
        // Nếu bạn CHƯA cài đặt biến môi trường, hệ thống sẽ trả về link MOCK (Giả lập) để web không bị lỗi
        if (!PRIVATE_KEY || !USERNAME || !PASSWORD) {
            return res.status(200).json({ 
                success: true, 
                isMock: true,
                paymentUrl: `https://sandbox.paygate.vn/checkout/${orderId}`,
                message: "Đang chạy chế độ MOCK do chưa cấu hình Environment Variables trên Vercel."
            });
        }
        
        // Sửa lỗi format Private Key (rất hay gặp khi paste vào Vercel bị mất xuống dòng)
        PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, '\n');
        if (PRIVATE_KEY.split('\n').length <= 2) {
            // Hỗ trợ cả chuẩn PKCS#8 (PRIVATE KEY) và PKCS#1 (RSA PRIVATE KEY)
            let keyBody = PRIVATE_KEY.replace(/-----BEGIN (RSA )?PRIVATE KEY-----/, '')
                                     .replace(/-----END (RSA )?PRIVATE KEY-----/, '')
                                     .replace(/\s+/g, '');
            let formattedBody = '';
            for (let i = 0; i < keyBody.length; i += 64) {
                formattedBody += keyBody.substring(i, i + 64) + '\n';
            }
            // Khôi phục lại đúng header của người dùng
            const isRSA = PRIVATE_KEY.includes('RSA');
            const header = isRSA ? '-----BEGIN RSA PRIVATE KEY-----' : '-----BEGIN PRIVATE KEY-----';
            const footer = isRSA ? '-----END RSA PRIVATE KEY-----' : '-----END PRIVATE KEY-----';
            PRIVATE_KEY = `${header}\n${formattedBody}${footer}`;
        }

        // Hàm tạo chữ ký RSA-2048
        const generateSignature = (rId, rTime, tenant, bodyObj) => {
            const payloadToSign = `${rId}${rTime}${tenant}${JSON.stringify(bodyObj)}`;
            const sign = crypto.createSign('SHA256');
            sign.update(payloadToSign);
            sign.end();
            return sign.sign(PRIVATE_KEY, 'base64');
        };

        // Mã hóa Password theo chuẩn: base64(hex(sha256(username + password)))
        const rawPassword = PASSWORD;
        let hashedPassword = rawPassword;
        
        // Tránh mã hóa 2 lần nếu bạn đã tự mã hóa và điền vào Vercel (chuỗi 88 ký tự)
        if (rawPassword.length !== 88) {
            const inputString = USERNAME + rawPassword; // Thử đổi thứ tự: Username + Password
            const sha256Hex = crypto.createHash('sha256').update(inputString).digest('hex');
            hashedPassword = Buffer.from(sha256Hex).toString('base64');
        }

        // ==========================================
        // BƯỚC 1: GỌI API LOGIN ĐỂ LẤY ACCESS TOKEN
        // ==========================================
        const loginReqId = crypto.randomUUID();
        const loginTime = getFormattedTime();
        const loginBody = { username: USERNAME, password: hashedPassword };
        const payloadToSign = `${loginReqId}${loginTime}${TENANT}${JSON.stringify(loginBody)}`;
        const loginSig = generateSignature(loginReqId, loginTime, TENANT, loginBody);

        const loginRes = await fetch(`${PAY2PAY_API_URL}/auth-service/api/v1.0/user/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
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
        
        const debugLogin = {
            payloadToSign: payloadToSign,
            generatedSignature: loginSig,
            requestHeaders: {
                'p-request-id': loginReqId,
                'p-request-time': loginTime,
                'p-tenant': TENANT,
                'p-signature': loginSig
            },
            requestBody: loginBody,
            responseStatus: loginRes.status,
            responseBody: loginText
        };

        if (loginData.code !== 'SUCCESS') {
            return res.status(400).json({ 
                success: false, 
                message: `Đăng nhập API thất bại (HTTP ${loginRes.status}): ` + (loginData.message || loginText || 'Empty response'),
                debugLogin: debugLogin
            });
        }
        const accessToken = loginData.data.accessToken;

        // ==========================================
        // BƯỚC 2: GỌI API INIT PAYMENT
        // ==========================================
        const initReqId = crypto.randomUUID();
        const initTime = getFormattedTime();
        const initBody = {
            currency: "VND",
            issuerId: "PAYGATE",
            command: "PAY",
            paymentMethod: "QRBANK",
            merchantData: {
                orderId: orderId,
                orderDesc: description || `Thanh toán đơn hàng ${orderId}`,
                amount: Number(amount),
                returnUrl: returnUrl
            }
        };
        
        // Dùng TENANT KING01 của mình. 
        // Đưa Authorization vào lại chuỗi ký vì tài liệu gốc (bảng chữ cái) Authorization (A) -> p-...
        const INIT_TENANT = TENANT; 
        const authHeader = `Bearer ${accessToken}`; 
        const initPayloadToSign = `${authHeader}${initReqId}${initTime}${INIT_TENANT}${JSON.stringify(initBody)}`;
        
        const signInit = crypto.createSign('SHA256');
        signInit.update(initPayloadToSign);
        signInit.end();
        const initSig = signInit.sign(PRIVATE_KEY, 'base64');

        const initRes = await fetch(`${PAY2PAY_API_URL}/pgw-transaction-service/mch/api/v1.0/initialize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'p-request-id': initReqId,
                'p-request-time': initTime,
                'p-tenant': INIT_TENANT,
                'Authorization': authHeader,
                'p-signature': initSig
            },
            body: JSON.stringify(initBody)
        });

        const initText = await initRes.text();
        let initData = {};
        try { initData = initText ? JSON.parse(initText) : {}; } catch(e) {}

        if (initData.code === 'SUCCESS') {
            return res.status(200).json({ 
                success: true, 
                paymentUrl: initData.data?.paymentUrl || initData.data?.payment_url || initData.data?.redirectUrl,
                rawData: initData
            });
        } else {
            return res.status(400).json({ 
                success: false, 
                message: `Tạo thanh toán thất bại (HTTP ${initRes.status}): ` + (initData.message || initText || 'Empty response'),
                debugLogin: debugLogin,
                debugInit: {
                    payloadToSign: initPayloadToSign,
                    generatedSignature: initSig,
                    requestHeaders: {
                        'Authorization': authHeader,
                        'p-request-id': initReqId,
                        'p-request-time': initTime,
                        'p-tenant': INIT_TENANT,
                        'p-signature': initSig
                    },
                    requestBody: initBody,
                    responseStatus: initRes.status,
                    responseBody: initText
                }
            });
        }

    } catch (error) {
        console.error('Lỗi tích hợp Pay2Pay API:', error);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ (Vercel): ' + (error.message || error.toString()) });
    }
}
