/**
 * App Module
 * Khởi tạo ứng dụng và quản lý routing
 */
window.App = (function() {
    const pages = ['home', 'docs', 'demo', 'cart', 'payment-success'];
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
            case 'payment-result':
                // Phân tích URL param (vd: #payment-result?orderId=XXX)
                const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
                const orderId = urlParams.get('orderId');
                
                if (orderId) {
                    document.getElementById('result-order-info').classList.remove('hidden');
                    document.getElementById('result-order-id').textContent = orderId;
                    
                    // Giả lập đang kiểm tra trạng thái trong 3s 
                    // (Trong thực tế: Gọi API /api/check-status bằng orderId)
                    setTimeout(() => {
                        document.getElementById('result-title').textContent = "Giao dịch thành công!";
                        document.getElementById('result-message').textContent = "Thanh toán đã được xác nhận bởi cổng Pay2Pay.";
                        
                        const iconContainer = document.getElementById('result-icon-container');
                        iconContainer.className = "w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6";
                        iconContainer.innerHTML = `<svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
                    }, 2500);
                }
                break;
            case 'payment-success':
                CartModule.clear();
                break;
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Close mobile menu
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu) mobileMenu.classList.add('hidden');
    }

    function handleHashChange() {
        const hash = window.location.hash.slice(1) || 'home';
        navigate(hash);
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
