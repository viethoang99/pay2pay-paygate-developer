/**
 * PayGate Configuration
 * Thay đổi các giá trị bên dưới để kết nối với API backend thật
 */
window.AppConfig = {
    // Tên cổng thanh toán
    GATEWAY_NAME: 'PayGate',

    // API Backend URL - thay đổi khi kết nối BE thật
    API_URL: 'https://api.paygate.vn/v1',

    // Endpoint tạo payment link
    CREATE_PAYMENT_ENDPOINT: '/create-payment',

    // URL callback sau khi thanh toán
    RETURN_URL: window.location.href.split('#')[0] + '#payment-success',
    CANCEL_URL: window.location.href.split('#')[0] + '#cart',

    // Tiền tệ
    CURRENCY: 'VND',

    // Chế độ Mock - đặt false khi kết nối API thật
    MOCK_MODE: true,

    // Thời gian delay giả lập (ms) - chỉ dùng khi MOCK_MODE = true  
    MOCK_DELAY: 1500,

    // URL thanh toán giả lập
    MOCK_PAYMENT_URL: 'https://sandbox.paygate.vn/checkout/',

    // API Key (đưa vào header Authorization)
    API_KEY: 'pk_test_demo_key_12345',

    // Merchant ID
    MERCHANT_ID: 'MCH_DEMO_001',
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
