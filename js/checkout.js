/**
 * Checkout Module - Pay2Pay Gateway
 * Xử lý thanh toán: gọi API backend và trực tiếp chuyển hướng người dùng tới Cổng Pay2Pay
 */
window.CheckoutModule = (function() {

    /**
     * Gọi API backend (Serverless Function) 
     * để khởi tạo giao dịch và nhận link thanh toán từ Cổng Pay2Pay
     */
    async function callPaymentAPI(orderData) {
        let apiUrl = AppConfig.API_URL || '/api/create-payment';
        let response = null;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), (AppConfig.API_TIMEOUT || 12000));

        try {
            try {
                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(orderData),
                    signal: controller.signal
                });
            } catch (networkErr) {
                // Nếu gọi URL cục bộ thất bại (ví dụ chạy static trên GitHub Pages hoặc localhost), thử Fallback URL
                if (AppConfig.BACKEND_FALLBACK_URL && apiUrl !== AppConfig.BACKEND_FALLBACK_URL) {
                    console.warn(`[Checkout] URL ${apiUrl} lỗi kết nối, chuyển sang fallback ${AppConfig.BACKEND_FALLBACK_URL}`);
                    apiUrl = AppConfig.BACKEND_FALLBACK_URL;
                    response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(orderData),
                        signal: controller.signal
                    });
                } else {
                    throw networkErr;
                }
            }

            clearTimeout(timeoutId);

            // Nếu endpoint trả về 404 (chạy trên server tĩnh không có backend runtime), gọi fallback Vercel
            if (response && response.status === 404 && AppConfig.BACKEND_FALLBACK_URL && apiUrl !== AppConfig.BACKEND_FALLBACK_URL) {
                console.warn(`[Checkout] Endpoint 404, thử kết nối qua ${AppConfig.BACKEND_FALLBACK_URL}`);
                apiUrl = AppConfig.BACKEND_FALLBACK_URL;
                const fbController = new AbortController();
                const fbTimeoutId = setTimeout(() => fbController.abort(), 10000);
                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(orderData),
                    signal: fbController.signal
                });
                clearTimeout(fbTimeoutId);
            }

            if (!response) {
                throw new Error('Không nhận được phản hồi từ máy chủ thanh toán.');
            }

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error(`Máy chủ phản hồi định dạng không hợp lệ (HTTP ${response.status})`);
            }

            const result = await response.json();
            
            if (!response.ok || !result.success) {
                throw new Error(result.message || result.error || `Lỗi cổng thanh toán (HTTP ${response.status})`);
            }

            const paymentLink = result.paymentUrl || (result.data && (result.data.paymentLink || result.data.paymentUrl));
            if (!paymentLink) {
                throw new Error(result.message || 'Không nhận được liên kết thanh toán từ cổng Pay2Pay');
            }

            return {
                success: true,
                paymentLink: paymentLink,
                orderId: orderData.orderId,
                message: result.message
            };

        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Kết nối tới cổng thanh toán bị quá hạn (Timeout). Vui lòng thử lại!');
            }
            throw error;
        }
    }

    function getResultReturnUrl() {
        const raw = AppConfig.RETURN_URL || (window.location.origin + window.location.pathname);
        const clean = raw.split('?')[0];
        return clean.includes('#payment-result') ? clean : (clean.split('#')[0] + '#payment-result');
    }

    /**
     * Mock API response cho demo khi người dùng chủ động bật MOCK_MODE = true
     */
    async function mockPaymentAPI(orderData) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const target = getResultReturnUrl();
                const separator = target.includes('?') ? '&' : '?';
                resolve({
                    success: true,
                    paymentLink: `${target}${separator}code=SUCCESS&status=SUCCESS&orderId=${orderData.orderId}&amount=${orderData.amount}&txnId=TXN${Date.now()}&message=Giao+dich+thanh+cong`,
                    orderId: orderData.orderId,
                    message: 'Payment link created successfully'
                });
            }, AppConfig.MOCK_DELAY || 300);
        });
    }

    /**
     * Xử lý thanh toán chính: gửi dữ liệu lên BE và điều hướng trực tiếp sang Pay2Pay
     */
    async function processPayment() {
        const cartItems = CartModule.getItems();
        if (cartItems.length === 0) {
            showToast('Giỏ hàng trống! Vui lòng chọn sản phẩm trước.', 'error');
            return;
        }

        const orderId = generateOrderId();
        const totalAmount = CartModule.getTotal();

        // Chuẩn bị order data
        const orderData = {
            orderId: orderId,
            amount: totalAmount,
            currency: AppConfig.CURRENCY,
            description: `Thanh toán đơn hàng ${orderId}`,
            returnUrl: AppConfig.RETURN_URL,
            cancelUrl: AppConfig.CANCEL_URL,
            merchantId: AppConfig.MERCHANT_ID,
            items: cartItems.map(item => ({
                name: item.product.nameVi || item.product.name,
                quantity: item.quantity,
                price: item.product.price,
                totalPrice: item.product.price * item.quantity,
            })),
            customerInfo: {
                name: 'Khách hàng Demo',
                email: 'demo@pay2pay.vn',
            },
            metadata: {
                source: 'pay2pay-developer-portal',
                createdAt: new Date().toISOString(),
            }
        };

        // Lưu thông tin pending order vào sessionStorage
        sessionStorage.setItem('pay2pay_pending_payment', JSON.stringify({
            orderId: orderData.orderId,
            amount: orderData.amount,
            items: orderData.items,
            timestamp: Date.now()
        }));

        // Hiển thị loading overlay
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('hidden');
            loadingOverlay.classList.add('flex');
        }

        try {
            let result;

            if (AppConfig.MOCK_MODE) {
                // Chế độ giả lập (khi người dùng chủ động cấu hình MOCK_MODE = true)
                result = await mockPaymentAPI(orderData);
            } else {
                // Chế độ kết nối thật: Gọi Serverless Function backend
                result = await callPaymentAPI(orderData);
            }

            if (result && result.success && result.paymentLink) {
                // Chuyển hướng trực tiếp theo link thanh toán Pay2Pay trả về
                console.log('[Checkout] Điều hướng tới cổng Pay2Pay:', result.paymentLink);
                window.location.href = result.paymentLink;
                return;
            } else {
                throw new Error((result && result.message) || 'Không nhận được liên kết thanh toán từ máy chủ');
            }

        } catch (error) {
            console.error('[Checkout Error]:', error);
            showToast(`Lỗi kết nối Pay2Pay: ${error.message}`, 'error');
        } finally {
            if (loadingOverlay) {
                loadingOverlay.classList.add('hidden');
                loadingOverlay.classList.remove('flex');
            }
        }
    }

    return {
        processPayment,
        callPaymentAPI
    };
})();
