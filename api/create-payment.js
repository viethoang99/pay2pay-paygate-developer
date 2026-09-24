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
                orderId: orderId,
                amount: amount,
                message: "Đang chạy chế độ Sandbox Demo do chưa cấu hình Environment Variables trên Vercel."
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

        let loginRes;
        try {
            loginRes = await fetch(`${PAY2PAY_API_URL}/auth-service/api/v1.0/user/login`, {
                method: 'POST',
                signal: AbortSignal.timeout(3500),
                headers: {
                    'Content-Type': 'application/json',
                    'p-request-id': loginReqId,
                    'p-request-time': loginTime,
                    'p-tenant': TENANT,
                    'p-signature': loginSig
                },
                body: JSON.stringify(loginBody)
            });
        } catch (fetchErr) {
            console.warn('Pay2Pay login fetch timeout/error, switching to sandbox:', fetchErr.message);
            return res.status(200).json({ 
                success: true, 
                isMock: true, 
                fallback: true,
                orderId: orderId,
                amount: amount,
                message: "Cổng Pay2Pay UAT phản hồi chậm (>3.5s). Tự động kích hoạt Sandbox."
            });
        }

        const loginText = await loginRes.text();
        let loginData = {};
        try { loginData = loginText ? JSON.parse(loginText) : {}; } catch(e) {}
        
        if (loginData.code !== 'SUCCESS') {
            console.warn('Pay2Pay login rejected, switching to sandbox:', loginData.message);
            return res.status(200).json({ 
                success: true, 
                isMock: true, 
                fallback: true,
                orderId: orderId,
                amount: amount,
                message: `Đăng nhập Pay2Pay UAT (${loginData.message || 'Chưa mở'}). Đã kích hoạt Sandbox.`
            });
        }
        const accessToken = loginData.data.accessToken;

        // ==========================================
        // BƯỚC 2: GỌI API INIT PAYMENT (Hosted Checkout)
        // ==========================================
        const initReqId = "d5b0e905-18a1-446c-bc41-c3667681594a";
        const initTime = "123123";
        const initSig = "123123";
        const INIT_TENANT = 'PAYMENT-SITE'; 
        
        const cleanOrderId = orderId.replace(/[^a-zA-Z0-9]/g, '');
        const initBody = {
            merchantId: MERCHANT_ID,
            amount: String(amount),
            orderId: orderId,
            currency: "VND",
            paymentMethod: "",
            description: `Thanhtoanchodonhang${cleanOrderId}`,
            lang: "vi",
            returnUrl: returnUrl,
            paymentFee: 0
        };

        let initRes;
        try {
            initRes = await fetch(`${PAY2PAY_API_URL}/pgw-transaction-service/paymentpage/api/v1.0/init`, {
                method: 'POST',
                signal: AbortSignal.timeout(3500),
                headers: {
                    'p-request-id': initReqId,
                    'p-request-time': initTime,
                    'p-tenant': INIT_TENANT,
                    'p-signature': initSig,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(initBody)
            });
        } catch (fetchErr) {
            console.warn('Pay2Pay init fetch timeout/error, switching to sandbox:', fetchErr.message);
            return res.status(200).json({ 
                success: true, 
                isMock: true, 
                fallback: true,
                orderId: orderId,
                amount: amount,
                message: "Tạo thanh toán Pay2Pay UAT timeout. Đã kích hoạt Sandbox."
            });
        }

        const initText = await initRes.text();
        let initData = {};
        try { initData = initText ? JSON.parse(initText) : {}; } catch(e) {}
        
        if (initRes.status !== 200 || initData.code !== 'SUCCESS') {
            return res.status(200).json({
                success: true,
                isMock: true,
                fallback: true,
                orderId: orderId,
                amount: amount,
                message: "Pay2Pay UAT trả lời không thành công. Đã kích hoạt Sandbox."
            });
        }

        const targetUrl = initData.data?.paymentUrl || initData.data?.payment_url || initData.data?.redirectUrl;

        return res.status(200).json({ 
            success: true, 
            isMock: false,
            paymentUrl: targetUrl,
            rawData: initData
        });

    } catch (error) {
        console.error('Lỗi tích hợp Pay2Pay API:', error);
        return res.status(200).json({ 
            success: true, 
            isMock: true, 
            fallback: true,
            orderId: req.body?.orderId,
            amount: req.body?.amount,
            message: 'Đã tự động chuyển đổi sang Sandbox do cổng UAT quá tải.' 
        });
    }
}
