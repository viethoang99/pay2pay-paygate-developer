/**
 * Pay2Pay Gateway Configuration
 * Cấu hình kết nối API và thông số tích hợp
 */
window.AppConfig = {
    // Tên cổng thanh toán
    GATEWAY_NAME: 'Pay2Pay',

    // API Backend URL:
    // Tự động nhận diện: Khi chạy trên GitHub Pages hoặc máy chủ tĩnh, tự động trỏ tới Vercel Serverless Function
    API_URL: (function() {
        if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
            return 'https://pay2pay-paygate-developer.vercel.app/api/create-payment';
        }
        return '/api/create-payment';
    })(),

    // Backup URL phòng trường hợp chạy local test không có runtime serverless
    BACKEND_FALLBACK_URL: 'https://pay2pay-paygate-developer.vercel.app/api/create-payment',

    // Timeout kết nối API (ms)
    API_TIMEOUT: 12000,

    // URL callback sau khi thanh toán - trỏ trực tiếp về màn hình kết quả payment-result
    RETURN_URL: (function() {
        const base = window.location.origin + window.location.pathname;
        const cleanBase = base.split('#')[0].split('?')[0];
        return cleanBase + '#payment-result';
    })(),
    CANCEL_URL: (function() {
        const base = window.location.origin + window.location.pathname;
        const cleanBase = base.split('#')[0].split('?')[0];
        return cleanBase + '#payment-result?status=CANCEL';
    })(),

    // Tiền tệ
    CURRENCY: 'VND',

    // Chế độ Mock (false: gọi API BE thật để redirect sang cổng Pay2Pay; true: giả lập callback)
    MOCK_MODE: false,

    // Thời gian delay giả lập khi bật Mock (ms)
    MOCK_DELAY: 300,

    // API Key & Merchant Demo
    API_KEY: 'pk_test_demo_key_pay2pay',
    MERCHANT_ID: 'PP0000141001',
};

/**
 * Helper: Format tiền VND
 */
window.formatCurrency = function(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(amount);
};

/**
 * Helper: Generate Order ID
 */
window.generateOrderId = function() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
};
