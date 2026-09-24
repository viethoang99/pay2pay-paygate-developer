/**
 * Checkout Module - Pay2Pay Gateway
 * Xử lý thanh toán: gọi API backend và trực tiếp chuyển hướng theo URL từ BE trả về
 */
window.CheckoutModule = (function() {

    /**
     * Gọi API nội bộ trên Vercel (Serverless Function) 
     * để lấy payment link thật từ Backend
     */
    async function callPaymentAPI(orderData) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), (AppConfig.API_TIMEOUT || 15000));

        try {
            const response = await fetch(AppConfig.API_URL || '/api/create-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error(`API phản hồi không hợp lệ (HTTP ${response.status})`);
            }

            const result = await response.json();
            
            if (!response.ok || !result.success) {
                throw new Error(result.error || result.message || `Lỗi API (HTTP ${response.status})`);
            }

            const paymentLink = result.paymentUrl || (result.data && (result.data.paymentLink || result.data.paymentUrl));
            if (!paymentLink) {
                throw new Error(result.message || 'Không nhận được liên kết thanh toán từ máy chủ');
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

    /**
     * Mock API response cho demo khi bật MOCK_MODE
     */
    async function mockPaymentAPI(orderData) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const baseReturn = AppConfig.RETURN_URL || window.location.href.split('#')[0];
                const separator = baseReturn.includes('?') ? '&' : '?';
                resolve({
                    success: true,
                    paymentLink: `${baseReturn}${separator}code=SUCCESS&status=SUCCESS&orderId=${orderData.orderId}&amount=${orderData.amount}`,
                    orderId: orderData.orderId,
                    message: 'Payment link created successfully'
                });
            }, AppConfig.MOCK_DELAY || 300);
        });
    }

    /**
     * Xử lý thanh toán chính: gọi API BE và redirect
     */
    async function processPayment() {
        const cartItems = CartModule.getItems();
        if (cartItems.length === 0) {
            showToast('Giỏ hàng trống!', 'error');
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
                name: item.product.name,
                quantity: item.quantity,
                price: item.product.price,
                totalPrice: item.product.price * item.quantity,
            })),
            customerInfo: {
                name: 'Khách hàng Demo',
                email: 'demo@example.com',
            },
            metadata: {
                source: 'pay2pay-developer-portal',
                createdAt: new Date().toISOString(),
            }
        };

        // Lưu trước thông tin pending order vào sessionStorage để đảm bảo khi redirect về
        // kể cả gateway trả về ít tham số thì trang kết quả vẫn hiển thị đầy đủ số tiền & đơn hàng
        sessionStorage.setItem('pay2pay_pending_payment', JSON.stringify({
            orderId: orderData.orderId,
            amount: orderData.amount,
            items: orderData.items,
            timestamp: Date.now()
        }));

        // Show loading overlay
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('hidden');
            loadingOverlay.classList.add('flex');
        }

        try {
            let result;

            if (AppConfig.MOCK_MODE) {
                // Chế độ demo - dùng mock API
                result = await mockPaymentAPI(orderData);
            } else {
                // Chế độ production - gọi API BE thật
                result = await callPaymentAPI(orderData);
            }

            if (result.success && result.paymentLink) {
                // Redirect trực tiếp theo link BE trả về
                window.location.href = result.paymentLink;
                return;
            } else {
                throw new Error(result.message || 'Không nhận được liên kết thanh toán từ máy chủ');
            }

        } catch (error) {
            console.error('Payment Error:', error);
            // Xóa pending order nếu khởi tạo thất bại
            sessionStorage.removeItem('pay2pay_pending_payment');
            showToast(`Lỗi: ${error.message}`, 'error');
        } finally {
            if (loadingOverlay) {
                loadingOverlay.classList.add('hidden');
                loadingOverlay.classList.remove('flex');
            }
        }
    }

    return {
        processPayment
    };
})();
