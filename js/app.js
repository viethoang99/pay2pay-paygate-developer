/**
 * App Module
 * Khởi tạo ứng dụng và quản lý routing
 */
window.App = (function() {
    const pages = ['home', 'docs', 'demo', 'cart', 'payment-result'];
    let currentPage = 'home';

    function navigate(page) {
        if (!pages.includes(page)) page = 'home';
        currentPage = page;

        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.add('hidden');
        });

        // Show target page
        const target = document.getElementById(`page-${page}`);
        if (target) {
            target.classList.remove('hidden');
        }

        // Update nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            const linkPage = link.dataset.page;
            link.classList.toggle('active', linkPage === page);
        });

        // Page-specific init
        switch(page) {
            case 'demo':
                ProductsModule.render();
                CartModule.render();
                break;
            case 'cart':
                navigate('demo');
                break;
            case 'docs':
                DocsModule.init();
                break;
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Close mobile menu
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu) mobileMenu.classList.add('hidden');
    }

    function parseTxnFromParams(urlParams) {
        if (!urlParams) return null;

        const rawStatus = urlParams.get('status') || urlParams.get('code') || urlParams.get('resultCode') || urlParams.get('paymentStatus') || urlParams.get('vnp_ResponseCode');
        const orderId = urlParams.get('orderId') || urlParams.get('order_id') || urlParams.get('orderID') || urlParams.get('vnp_TxnRef');
        const txnId = urlParams.get('txnId') || urlParams.get('txn_id') || urlParams.get('transId') || urlParams.get('trans_id') || urlParams.get('transactionId') || urlParams.get('vnp_TransactionNo');

        // Phải có ít nhất một trong các trường nhận diện thanh toán
        if (!rawStatus && !orderId && !txnId) {
            return null;
        }

        // Lấy thông tin pending order từ sessionStorage nếu có
        let pending = null;
        try {
            const saved = sessionStorage.getItem('pay2pay_pending_payment');
            if (saved) pending = JSON.parse(saved);
        } catch(e) {}

        const finalOrderId = orderId || (pending ? pending.orderId : '');
        const rawAmount = urlParams.get('amount') || (pending ? pending.amount : '');

        // Chuẩn hóa status
        let finalStatus = 'SUCCESS';
        if (rawStatus) {
            const s = String(rawStatus).trim().toUpperCase();
            if (['SUCCESS', '00', '0', 'PAID', 'COMPLETED', 'APPROVED', 'TRUE', '200'].includes(s)) {
                finalStatus = 'SUCCESS';
            } else if (['PROCESSING', 'PENDING', 'WAITING'].includes(s)) {
                finalStatus = 'PROCESSING';
            } else if (['CANCEL', 'CANCELLED', 'CANCELED'].includes(s)) {
                finalStatus = 'CANCEL';
            } else {
                finalStatus = 'FAIL';
            }
        }

        return {
            status: finalStatus,
            merchantId: urlParams.get('merchantId') || (window.AppConfig && window.AppConfig.MERCHANT_ID) || '',
            orderId: finalOrderId,
            txnId: txnId || ('TXN' + Date.now().toString().slice(-8)),
            amount: rawAmount,
            code: rawStatus || (finalStatus === 'SUCCESS' ? 'SUCCESS' : 'FAIL'),
            message: urlParams.get('message') || '',
            txnDate: urlParams.get('txnDate') || urlParams.get('payDate') || '',
        };
    }

    function handleHashChange() {
        const fullHash = window.location.hash.slice(1) || 'home';
        const [page, queryString] = fullHash.split('?');
        
        if (page === 'payment-result') {
            let txnInfo = null;
            if (queryString) {
                const hashParams = new URLSearchParams(queryString);
                txnInfo = parseTxnFromParams(hashParams);
            }
            if (!txnInfo) {
                try {
                    const saved = sessionStorage.getItem('pay2pay_last_result');
                    if (saved) txnInfo = JSON.parse(saved);
                } catch(e) {}
            }

            navigate('payment-result');
            if (txnInfo) {
                renderPaymentResult(txnInfo);
            }
            return;
        }
        
        navigate(page);
    }

    /**
     * Kiểm tra URL query params từ Pay2Pay callback
     * Hỗ trợ đọc cả window.location.search và window.location.hash
     * Hỗ trợ đa dạng tham số: status, code (SUCCESS, 00), orderId, txnId, v.v.
     */
    function checkPaymentCallback() {
        // Gom toàn bộ params từ URL search và hash
        const combinedParams = new URLSearchParams(window.location.search);
        if (window.location.hash.includes('?')) {
            const hashQuery = window.location.hash.split('?')[1];
            const hashParams = new URLSearchParams(hashQuery);
            for (const [k, v] of hashParams.entries()) {
                if (!combinedParams.has(k)) {
                    combinedParams.set(k, v);
                }
            }
        }

        const txnInfo = parseTxnFromParams(combinedParams);
        if (!txnInfo) return false;

        // Nếu thanh toán thành công, xóa giỏ hàng
        if (txnInfo.status === 'SUCCESS') {
            if (window.CartModule) {
                CartModule.clear();
                CartModule.render();
            }
        }

        // Lưu vào sessionStorage để khi reload hoặc chuyển trang vẫn hiển thị đúng
        sessionStorage.setItem('pay2pay_last_result', JSON.stringify(txnInfo));
        sessionStorage.removeItem('pay2pay_pending_payment');

        // Xóa query params khỏi URL để URL sạch đẹp
        window.history.replaceState({}, document.title, window.location.pathname + '#payment-result');

        // Hiển thị trang payment-result
        navigate('payment-result');
        renderPaymentResult(txnInfo);

        return true;
    }

    /**
     * Render giao diện kết quả thanh toán dựa trên txnInfo từ Pay2Pay
     */
    function renderPaymentResult(txnInfo) {
        const iconContainer = document.getElementById('result-icon-container');
        const title = document.getElementById('result-title');
        const message = document.getElementById('result-message');
        const orderInfo = document.getElementById('result-order-info');
        const txnDetails = document.getElementById('result-txn-details');

        if (!iconContainer || !title) return;

        // Hiện thông tin đơn hàng
        if (txnInfo.orderId) {
            if (orderInfo) orderInfo.classList.remove('hidden');
            const el = document.getElementById('result-order-id');
            if (el) el.textContent = txnInfo.orderId;
        }

        // Hiện chi tiết giao dịch
        if (txnDetails) {
            if (txnInfo.txnId) {
                const el = document.getElementById('result-txn-id');
                if (el) el.textContent = txnInfo.txnId;
            }
            if (txnInfo.amount) {
                const amt = parseInt(txnInfo.amount, 10);
                const el = document.getElementById('result-amount');
                if (el) el.textContent = !isNaN(amt) && window.formatCurrency ? formatCurrency(amt) : txnInfo.amount;
            }
            
            const dateEl = document.getElementById('result-txn-date');
            if (dateEl) {
                if (txnInfo.txnDate) {
                    const d = String(txnInfo.txnDate);
                    dateEl.textContent = d.length === 8 
                        ? d.slice(6,8) + '/' + d.slice(4,6) + '/' + d.slice(0,4)
                        : d;
                } else {
                    const now = new Date();
                    const pad = n => String(n).padStart(2, '0');
                    dateEl.textContent = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
                }
            }

            txnDetails.classList.remove('hidden');
        }

        switch(txnInfo.status) {
            case 'SUCCESS':
                iconContainer.className = 'w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm';
                iconContainer.innerHTML = '<svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>';
                title.innerHTML = '<span class="lang-vi">Thanh toán thành công!</span><span class="lang-en">Payment Successful!</span>';
                title.className = 'text-2xl font-bold text-green-600 mb-2';
                message.innerHTML = `<span class="lang-vi">${txnInfo.message || 'Giao dịch đã được xử lý thành công. Cảm ơn bạn đã mua hàng!'}</span><span class="lang-en">Your transaction has been processed successfully. Thank you for your purchase!</span>`;
                break;

            case 'CANCEL':
                iconContainer.className = 'w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm';
                iconContainer.innerHTML = '<svg class="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>';
                title.innerHTML = '<span class="lang-vi">Giao dịch đã bị hủy</span><span class="lang-en">Payment Cancelled</span>';
                title.className = 'text-2xl font-bold text-amber-600 mb-2';
                message.innerHTML = `<span class="lang-vi">${txnInfo.message || 'Bạn đã hủy quá trình thanh toán. Đơn hàng chưa được thanh toán.'}</span><span class="lang-en">Payment process was cancelled. Order has not been paid.</span>`;
                break;

            case 'PROCESSING':
                iconContainer.className = 'w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm';
                iconContainer.innerHTML = '<svg class="w-10 h-10 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>';
                title.innerHTML = '<span class="lang-vi">Đang xử lý thanh toán</span><span class="lang-en">Payment Processing</span>';
                title.className = 'text-2xl font-bold text-blue-600 mb-2';
                message.innerHTML = `<span class="lang-vi">${txnInfo.message || 'Giao dịch đang được xử lý. Vui lòng chờ trong giây lát.'}</span><span class="lang-en">Transaction is being processed. Please wait a moment.</span>`;
                break;

            case 'FAIL':
            default:
                iconContainer.className = 'w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm';
                iconContainer.innerHTML = '<svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>';
                title.innerHTML = '<span class="lang-vi">Thanh toán thất bại</span><span class="lang-en">Payment Failed</span>';
                title.className = 'text-2xl font-bold text-red-600 mb-2';
                message.innerHTML = `<span class="lang-vi">${txnInfo.message || 'Đã xảy ra lỗi trong quá trình thanh toán. Vui lòng thử lại.'}</span><span class="lang-en">An error occurred during payment. Please try again.</span>`;
                break;
        }
    }

    function initLanguage() {
        const savedLang = localStorage.getItem('pay2pay_lang') || 'vi';
        document.documentElement.lang = savedLang;

        const langToggleBtn = document.getElementById('lang-toggle');
        if (langToggleBtn) {
            langToggleBtn.addEventListener('click', () => {
                const currentLang = document.documentElement.lang;
                const newLang = currentLang === 'vi' ? 'en' : 'vi';
                document.documentElement.lang = newLang;
                localStorage.setItem('pay2pay_lang', newLang);
            });
        }
    }

    function init() {
        // Initialize i18n
        initLanguage();
        
        // Initialize cart
        CartModule.init();

        // Initialize Code Sandbox
        if (window.CodeSandboxModule) {
            CodeSandboxModule.init();
        }

        // ƯU TIÊN: Kiểm tra callback từ Pay2Pay (có ?status= trong URL không)
        const isCallback = checkPaymentCallback();

        if (!isCallback) {
            // Nếu không phải callback, dùng hash routing bình thường
            handleHashChange();
        }

        // Set up hash routing
        window.addEventListener('hashchange', handleHashChange);

        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }

        // Checkout button
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                CheckoutModule.processPayment();
            });
        }

        // Handle nav-link-action clicks (hero buttons)
        document.querySelectorAll('.nav-link-action').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const hash = link.getAttribute('href');
                window.location.hash = hash;
            });
        });

        console.log('%c' + AppConfig.GATEWAY_NAME + ' Demo Website Loaded', 'color: #4f46e5; font-size: 16px; font-weight: bold;');
    }

    return {
        init,
        navigate,
        showPaymentResult: function(txnInfo) {
            navigate('payment-result');
            renderPaymentResult(txnInfo);
        }
    };
})();

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
