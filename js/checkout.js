/**
 * Checkout Module
 * Xử lý thanh toán: gọi API tạo payment link và mở tab mới
 */
window.CheckoutModule = (function() {

    /**
     * Gọi API nội bộ trên Vercel (Serverless Function) 
     * để ẩn Private Key và lấy payment link thật
     */
    async function callPaymentAPI(orderData) {
        const response = await fetch('/api/create-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData),
        });

        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || result.message || `Lỗi API (HTTP ${response.status})`);
        }

        // Định dạng lại response để tương thích với luồng bên dưới
        return {
            success: true,
            data: {
                paymentLink: result.paymentUrl,
                orderId: orderData.orderId
            },
            message: result.message
        };
    }

    /**
     * Mock API response cho demo
     */
    async function mockPaymentAPI(orderData) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    data: {
                        paymentLink: AppConfig.MOCK_PAYMENT_URL + orderData.orderId,
                        orderId: orderData.orderId,
                        amount: orderData.amount,
                        expiredAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                    },
                    message: 'Payment link created successfully'
                });
            }, AppConfig.MOCK_DELAY);
        });
    }

    /**
     * Xử lý thanh toán chính
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
                // Có thể mở rộng thêm form nhập thông tin khách hàng
                name: 'Khách hàng Demo',
                email: 'demo@example.com',
            },
            metadata: {
                source: 'demo-website',
                createdAt: new Date().toISOString(),
            }
        };

        // Show loading
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.classList.remove('hidden');
        loadingOverlay.classList.add('flex');

        try {
            let result;

            if (AppConfig.MOCK_MODE) {
                // Chế độ demo - dùng mock API
                result = await mockPaymentAPI(orderData);
            } else {
                // Chế độ production - gọi API thật
                result = await callPaymentAPI(orderData);
            }

            if (result.success && result.data && result.data.paymentLink) {
                // Mở payment link trong tab mới
                window.open(result.data.paymentLink, '_blank');
                showToast('Đã mở trang thanh toán!', 'success');

                // Clear cart sau khi tạo payment link thành công
                CartModule.clear();
                CartModule.render();

                // Log thông tin để debug
                console.log('=== PAYMENT CREATED ===');
                console.log('Order ID:', orderId);
                console.log('Amount:', formatCurrency(totalAmount));
                console.log('Payment Link:', result.data.paymentLink);
                console.log('Order Data:', orderData);
                console.log('API Response:', result);
                console.log('========================');
            } else {
                throw new Error(result.message || 'Không nhận được payment link');
            }

        } catch (error) {
            console.error('Payment Error:', error);
            showToast(`Lỗi: ${error.message}`, 'error');
        } finally {
            // Hide loading
            loadingOverlay.classList.add('hidden');
            loadingOverlay.classList.remove('flex');
        }
    }

    return {
        processPayment
    };
})();
