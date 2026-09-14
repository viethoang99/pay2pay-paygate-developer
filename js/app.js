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
                break;
            case 'cart':
                CartModule.render();
                break;
            case 'docs':
                DocsModule.init();
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
