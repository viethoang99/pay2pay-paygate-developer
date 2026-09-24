/**
 * Checkout Module - Pay2Pay Gateway
 * Tối ưu kết nối API siêu tốc, tự động fallback Sandbox Simulator, hỗ trợ thanh toán trực quan
 */
window.CheckoutModule = (function() {
    let countdownInterval = null;
    let currentOrder = null;

    /**
     * Gọi API tạo payment link với AbortController timeout (2.0s max)
     * Tránh tối đa hiện tượng trang web bị đơ, treo spinner hoặc chờ đợi lâu
     */
    async function callPaymentAPI(orderData) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), AppConfig.API_TIMEOUT || 2000);

        try {
            const response = await fetch(AppConfig.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Kiểm tra Content-Type để tránh lỗi SyntaxError khi gặp trang 404 HTML trên static hosting
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error('Endpoint không trả về JSON (Static/404 mode)');
            }

            const result = await response.json();

            // Nếu server trả về kết quả thành công và có paymentUrl hợp lệ (không phải link placeholder giả)
            if (result.success && result.paymentUrl && !result.paymentUrl.includes('sandbox.paygate.vn') && !result.isMock) {
                return {
                    isMock: false,
                    paymentLink: result.paymentUrl,
                    orderId: orderData.orderId
                };
            }

            // Nếu server báo chạy chế độ mock / fallback
            return {
                isMock: true,
                orderData: orderData,
                message: result.message || 'Chế độ Sandbox Demo'
            };

        } catch (err) {
            clearTimeout(timeoutId);
            const isAbort = err.name === 'AbortError';
            console.warn(`[Pay2Pay Checkout] API call ${isAbort ? 'timed out (>2s)' : 'failed'}:`, err.message);
            // Tự động fallback sang Sandbox simulator
            return {
                isMock: true,
                orderData: orderData,
                fallback: true,
                reason: isAbort ? 'API Timeout (>2.0s)' : err.message
            };
        }
    }

    /**
     * Khởi động đồng hồ đếm ngược giao dịch 15:00
     */
    function startCountdown(durationSeconds = 900) {
        if (countdownInterval) clearInterval(countdownInterval);
        
        let remaining = durationSeconds;
        const timerEl = document.getElementById('sandbox-timer-countdown');

        function updateDisplay() {
            if (!timerEl) return;
            const m = Math.floor(remaining / 60);
            const s = remaining % 60;
            timerEl.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }

        updateDisplay();
        countdownInterval = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
                clearInterval(countdownInterval);
                closeSandboxModal();
                showToast('Giao dịch đã hết hạn!', 'error');
            } else {
                updateDisplay();
            }
        }, 1000);
    }

    /**
     * Mở Modal Cổng Thanh Toán Sandbox Pay2Pay
     */
    function openSandboxModal(orderData) {
        currentOrder = orderData;
        const modal = document.getElementById('sandbox-payment-modal');
        if (!modal) return;

        // Điền thông tin đơn hàng
        const orderIdEl = document.getElementById('sandbox-order-id');
        const amountEl = document.getElementById('sandbox-amount');
        const transferContentEl = document.getElementById('sandbox-transfer-content');
        const transferAmountEl = document.getElementById('sandbox-transfer-amount');

        if (orderIdEl) orderIdEl.textContent = orderData.orderId;
        if (amountEl) amountEl.textContent = formatCurrency(orderData.amount);
        if (transferContentEl) transferContentEl.textContent = orderData.orderId;
        if (transferAmountEl) transferAmountEl.textContent = formatCurrency(orderData.amount);

        // Sinh link VietQR động
        const qrImg = document.getElementById('sandbox-qr-image');
        if (qrImg) {
            const qrUrl = `https://api.vietqr.io/image/970422-0399888999-compact.jpg?amount=${orderData.amount}&addInfo=${encodeURIComponent(orderData.orderId)}&accountName=${encodeURIComponent('PAY2PAY GATEWAY DEMO')}`;
            qrImg.src = qrUrl;
        }

        // Bắt đầu đếm ngược 15 phút
        startCountdown(900);

        // Reset về tab VietQR mặc định
        switchTab('vietqr');

        // Hiển thị modal
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    /**
     * Đóng Modal Sandbox
     */
    function closeSandboxModal() {
        if (countdownInterval) clearInterval(countdownInterval);
        const modal = document.getElementById('sandbox-payment-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }

    /**
     * Chuyển tab phương thức thanh toán trong modal
     */
    function switchTab(tabId) {
        const tabs = ['vietqr', 'atm', 'card'];
        tabs.forEach(t => {
            const btn = document.getElementById(`tab-btn-${t}`);
            const content = document.getElementById(`tab-content-${t}`);
            if (btn && content) {
                if (t === tabId) {
                    btn.classList.add('border-primary-600', 'text-primary-600', 'bg-primary-50/50');
                    btn.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700');
                    content.classList.remove('hidden');
                } else {
                    btn.classList.remove('border-primary-600', 'text-primary-600', 'bg-primary-50/50');
                    btn.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700');
                    content.classList.add('hidden');
                }
            }
        });
    }

    /**
     * Tự động điền dữ liệu thẻ test
     */
    function fillTestCard(type) {
        if (type === 'atm') {
            const cardNum = document.getElementById('napas-card-num');
            const cardHolder = document.getElementById('napas-card-holder');
            const cardDate = document.getElementById('napas-card-date');
            if (cardNum) cardNum.value = '9704 1985 2189 1234';
            if (cardHolder) cardHolder.value = 'NGUYEN VAN A';
            if (cardDate) cardDate.value = '07/22';
            showToast('Đã điền thông tin thẻ test Napas!', 'success');
        } else if (type === 'visa') {
            const cardNum = document.getElementById('visa-card-num');
            const cardHolder = document.getElementById('visa-card-holder');
            const cardDate = document.getElementById('visa-card-date');
            const cardCvv = document.getElementById('visa-card-cvv');
            if (cardNum) cardNum.value = '4111 2222 3333 4444';
            if (cardHolder) cardHolder.value = 'NGUYEN VAN A';
            if (cardDate) cardDate.value = '12/28';
            if (cardCvv) cardCvv.value = '123';
            showToast('Đã điền thông tin thẻ test Visa!', 'success');
        }
    }

    /**
     * Xử lý mô phỏng thanh toán thành công
     */
    async function simulateSuccess() {
        if (!currentOrder) return;
        const btn = document.getElementById('btn-simulate-success');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<svg class="w-4 h-4 animate-spin mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Đang xác thực GD...`;
        }

        setTimeout(() => {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<span><span class="lang-vi">✓ Giả lập Thanh toán Thành công</span><span class="lang-en">✓ Simulate Payment Success</span></span>`;
            }

            const order = currentOrder;
            closeSandboxModal();

            // Xóa giỏ hàng
            CartModule.clear();
            CartModule.render();

            // Hiển thị kết quả thanh toán thành công
            const txnInfo = {
                status: 'SUCCESS',
                orderId: order.orderId,
                txnId: 'TXN-' + Date.now().toString(36).toUpperCase(),
                amount: String(order.amount),
                message: 'Giao dịch đã được ghi nhận và thanh toán thành công qua Cổng Pay2Pay (Sandbox).',
                txnDate: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
            };

            if (window.App && typeof App.showPaymentResult === 'function') {
                App.showPaymentResult(txnInfo);
            } else {
                window.location.hash = `#payment-result?status=SUCCESS&orderId=${order.orderId}&amount=${order.amount}&txnId=${txnInfo.txnId}`;
            }

            showToast('Thanh toán thành công!', 'success');
        }, 400);
    }

    /**
     * Xử lý mô phỏng thanh toán thất bại
     */
    function simulateFail() {
        if (!currentOrder) return;
        const order = currentOrder;
        closeSandboxModal();

        const txnInfo = {
            status: 'FAIL',
            orderId: order.orderId,
            txnId: 'TXN-' + Date.now().toString(36).toUpperCase(),
            amount: String(order.amount),
            message: 'Giao dịch bị từ chối bởi Ngân hàng phát hành (Số dư không đủ hoặc OTP quá hạn).',
            txnDate: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
        };

        if (window.App && typeof App.showPaymentResult === 'function') {
            App.showPaymentResult(txnInfo);
        } else {
            window.location.hash = `#payment-result?status=FAIL&orderId=${order.orderId}&amount=${order.amount}&txnId=${txnInfo.txnId}`;
        }

        showToast('Giao dịch đã thất bại!', 'error');
    }

    /**
     * Sao chép nội dung vào Clipboard
     */
    function copyText(elementId, btnElement) {
        const el = document.getElementById(elementId);
        if (!el) return;
        const text = el.textContent.replace(/[^\w\d-]/g, '') || el.textContent.trim();
        
        navigator.clipboard.writeText(text).then(() => {
            const origHtml = btnElement.innerHTML;
            btnElement.innerHTML = `<span class="text-emerald-600 font-bold text-xs">Đã chép!</span>`;
            setTimeout(() => {
                btnElement.innerHTML = origHtml;
            }, 1500);
        }).catch(() => {
            showToast('Không thể sao chép!', 'error');
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
                name: 'Khách hàng Demo',
                email: 'demo@example.com',
            },
            metadata: {
                source: 'pay2pay-developer-portal',
                createdAt: new Date().toISOString(),
            }
        };

        // Nếu MOCK_MODE = true, mở trực tiếp Sandbox trong 200ms
        if (AppConfig.MOCK_MODE) {
            openSandboxModal(orderData);
            return;
        }

        // Show loading overlay
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('hidden');
            loadingOverlay.classList.add('flex');
        }

        try {
            // Thử gọi API với timeout ngắn (2s)
            const result = await callPaymentAPI(orderData);

            if (result && !result.isMock && result.paymentLink) {
                // Nếu backend trả về URL thật, chuyển trang trực tiếp
                window.location.href = result.paymentLink;
                return;
            }

            // Nếu là Mock, Fallback hoặc API không phản hồi kịp
            if (loadingOverlay) {
                loadingOverlay.classList.add('hidden');
                loadingOverlay.classList.remove('flex');
            }

            // Mở Sandbox Modal siêu tốc
            openSandboxModal(orderData);

            if (result.fallback) {
                console.info('[Pay2Pay] Tự động chuyển tiếp Sandbox do API timeout/chưa kết nối.');
            }

        } catch (error) {
            console.error('Payment Error:', error);
            if (loadingOverlay) {
                loadingOverlay.classList.add('hidden');
                loadingOverlay.classList.remove('flex');
            }
            // Mở Sandbox Modal thay vì làm gián đoạn trải nghiệm của người dùng
            openSandboxModal(orderData);
        }
    }

    return {
        processPayment,
        openSandboxModal,
        closeSandboxModal,
        switchTab,
        fillTestCard,
        simulateSuccess,
        simulateFail,
        copyText
    };
})();
