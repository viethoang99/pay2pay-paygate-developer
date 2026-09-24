/**
 * Pay2Pay Gateway Configuration
 * Cấu hình kết nối API và Cổng thanh toán Sandbox siêu tốc
 */
window.AppConfig = {
    // Tên cổng thanh toán
    GATEWAY_NAME: 'Pay2Pay',

    // API Backend URL (Serverless Function)
    API_URL: '/api/create-payment',

    // Timeout kết nối API (ms) - nếu backend không phản hồi trong 2s, tự động chuyển sang Sandbox tức thì
    API_TIMEOUT: 2000,

    // URL callback sau khi thanh toán
    RETURN_URL: window.location.origin + window.location.pathname,
    CANCEL_URL: window.location.href.split('#')[0] + '#demo',

    // Tiền tệ
    CURRENCY: 'VND',

    // Chế độ Mock / Sandbox Simulator (true: luôn mở sandbox ngay; false: ưu tiên API thật với fallback nhanh)
    MOCK_MODE: false,

    // Thời gian delay giả lập (ms) - tối ưu siêu mượt
    MOCK_DELAY: 350,

    // Kích hoạt Sandbox Modal Simulator khi API ngoài timeout hoặc chưa có backend
    SANDBOX_SIMULATOR_ENABLED: true,

    // API Key & Merchant Demo
    API_KEY: 'pk_test_demo_key_pay2pay',
    MERCHANT_ID: 'MERCHANT-DEMO-001',
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
