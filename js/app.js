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

    function handleHashChange() {
        const fullHash = window.location.hash.slice(1) || 'home';
        const page = fullHash.split('?')[0];
        navigate(page);
    }

    /**
     * Kiểm tra URL query params từ Pay2Pay callback
     * URL dạng: https://{domain}?status=SUCCESS&orderId=XXX&txnId=YYY&amount=100000&message=...
     * Status: SUCCESS | PROCESSING | FAIL
     */
    function checkPaymentCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');

        if (!status) return false;

        // Lấy toàn bộ thông tin giao dịch từ query params
        const txnInfo = {
            status: status,
            merchantId: urlParams.get('merchantId') || '',
            orderId: urlParams.get('orderId') || '',
            txnId: urlParams.get('txnId') || '',
            amount: urlParams.get('amount') || '',
            code: urlParams.get('code') || '',
            message: urlParams.get('message') || '',
            txnDate: urlParams.get('txnDate') || '',
        };

        // Xóa query params khỏi URL để reload không hiện lại
        window.history.replaceState({}, document.title, window.location.pathname + '#payment-result');

        // Hiện trang payment-result
        navigate('payment-result');
        renderPaymentResult(txnInfo);

        return true;
    }

    /**
     * Render giao diện kết quả thanh toán dựa trên status từ Pay2Pay
     */
    function renderPaymentResult(txnInfo) {
        const iconContainer = document.getElementById('result-icon-container');
        const title = document.getElementById('result-title');
        const message = document.getElementById('result-message');
        const orderInfo = document.getElementById('result-order-info');
        const txnDetails = document.getElementById('result-txn-details');

        // Hiện thông tin đơn hàng
        if (txnInfo.orderId) {
            orderInfo.classList.remove('hidden');
            document.getElementById('result-order-id').textContent = txnInfo.orderId;
        }

        // Hiện chi tiết giao dịch
        if (txnDetails) {
            if (txnInfo.txnId) {
                document.getElementById('result-txn-id').textContent = txnInfo.txnId;
            }
            if (txnInfo.amount) {
                document.getElementById('result-amount').textContent = formatCurrency(parseInt(txnInfo.amount));
            }
            if (txnInfo.txnDate) {
                const d = txnInfo.txnDate;
                document.getElementById('result-txn-date').textContent = d.length === 8 
                    ? d.slice(6,8) + '/' + d.slice(4,6) + '/' + d.slice(0,4)
                    : d;
            }
            if (txnInfo.txnId || txnInfo.amount || txnInfo.txnDate) {
                txnDetails.classList.remove('hidden');
            }
        }

        switch(txnInfo.status) {
            case 'SUCCESS':
                CartModule.clear();
                CartModule.render();
                iconContainer.className = 'w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm';
                iconContainer.innerHTML = '<svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>';
                title.textContent = 'Thanh toán thành công!';
                title.className = 'text-2xl font-bold text-green-600 mb-2';
                message.textContent = txnInfo.message || 'Giao dịch đã được xử lý thành công. Cảm ơn bạn đã mua hàng!';
                break;

            case 'FAIL':
                iconContainer.className = 'w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm';
                iconContainer.innerHTML = '<svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>';
                title.textContent = 'Thanh toán thất bại';
                title.className = 'text-2xl font-bold text-red-600 mb-2';
                message.textContent = txnInfo.message || 'Đã xảy ra lỗi trong quá trình thanh toán. Vui lòng thử lại.';
                break;

            case 'PROCESSING':
                iconContainer.className = 'w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm';
                iconContainer.innerHTML = '<svg class="w-10 h-10 text-amber-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>';
                title.textContent = 'Đang xử lý thanh toán';
                title.className = 'text-2xl font-bold text-amber-600 mb-2';
                message.textContent = txnInfo.message || 'Giao dịch đang được xử lý. Vui lòng chờ trong giây lát.';
                break;

            default:
                iconContainer.className = 'w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm';
                iconContainer.innerHTML = '<svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
                title.textContent = 'Không xác định trạng thái';
                title.className = 'text-2xl font-bold text-gray-600 mb-2';
                message.textContent = 'Không thể xác định trạng thái giao dịch. Vui lòng liên hệ hỗ trợ.';
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
        navigate
    };
})();

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
