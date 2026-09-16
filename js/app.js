/**
 * App Module
 * Khởi tạo ứng dụng và quản lý routing
 */
window.App = (function() {
    const pages = ['home', 'docs', 'demo', 'cart', 'payment-result'];
    let currentPage = 'home';

    function navigate(page) {
        // Map các status Pay2Pay trả về sang trang payment-result
        const paymentStatuses = ['payment-success', 'payment-failed', 'payment-pending', 'payment-cancel', 'payment-error'];
        let paymentStatus = null;
        
        if (paymentStatuses.includes(page) || page.startsWith('payment-')) {
            paymentStatus = page;
            page = 'payment-result';
        }

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
            case 'payment-result':
                renderPaymentResult(paymentStatus);
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
        const page = fullHash.split('?')[0]; // Strip query params
        navigate(page);
    }

    function renderPaymentResult(status) {
        const iconContainer = document.getElementById('result-icon-container');
        const title = document.getElementById('result-title');
        const message = document.getElementById('result-message');
        const orderInfo = document.getElementById('result-order-info');

        // Parse query params từ hash (vd: #payment-success?orderId=XXX&txnId=YYY)
        const hashParts = window.location.hash.split('?');
        const urlParams = new URLSearchParams(hashParts[1] || '');
        const orderId = urlParams.get('orderId') || urlParams.get('order_id') || '';
        const txnId = urlParams.get('txnId') || urlParams.get('txn_id') || '';

        // Hiện thông tin đơn hàng nếu có
        if (orderId || txnId) {
            orderInfo.classList.remove('hidden');
            document.getElementById('result-order-id').textContent = orderId || txnId;
        }

        if (!status || status === 'payment-result') {
            status = 'payment-success'; // default
        }

        switch(status) {
            case 'payment-success':
                CartModule.clear();
                CartModule.render();
                iconContainer.className = 'w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6';
                iconContainer.innerHTML = '<svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
                title.textContent = 'Thanh toán thành công!';
                title.className = 'text-2xl font-bold text-green-600 mb-3';
                message.textContent = 'Giao dịch của bạn đã được xử lý thành công. Cảm ơn bạn đã mua hàng!';
                break;

            case 'payment-failed':
            case 'payment-error':
            case 'payment-cancel':
                iconContainer.className = 'w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6';
                iconContainer.innerHTML = '<svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';
                title.textContent = status === 'payment-cancel' ? 'Giao dịch đã bị hủy' : 'Thanh toán thất bại';
                title.className = 'text-2xl font-bold text-red-600 mb-3';
                message.textContent = status === 'payment-cancel' 
                    ? 'Bạn đã hủy giao dịch thanh toán. Đơn hàng chưa được thanh toán.'
                    : 'Đã xảy ra lỗi trong quá trình thanh toán. Vui lòng thử lại hoặc chọn phương thức khác.';
                break;

            case 'payment-pending':
            default:
                iconContainer.className = 'w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6';
                iconContainer.innerHTML = '<svg class="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
                title.textContent = 'Đang chờ xử lý';
                title.className = 'text-2xl font-bold text-yellow-600 mb-3';
                message.textContent = 'Giao dịch đang được xử lý. Vui lòng chờ trong giây lát hoặc kiểm tra lại sau.';
                break;
        }
    }

    function init() {
        // Initialize cart
        CartModule.init();

        // Set up hash routing
        window.addEventListener('hashchange', handleHashChange);

        // Handle initial hash
        handleHashChange();

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

        console.log(`%c${AppConfig.GATEWAY_NAME} Demo Website Loaded`, 'color: #4f46e5; font-size: 16px; font-weight: bold;');
        console.log('%cMock Mode: ' + (AppConfig.MOCK_MODE ? 'ON' : 'OFF'), 'color: #6b7280;');
        if (AppConfig.MOCK_MODE) {
            console.log('%c→ Chỉnh AppConfig.MOCK_MODE = false và cập nhật API_URL để kết nối BE thật', 'color: #f59e0b;');
        }
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
