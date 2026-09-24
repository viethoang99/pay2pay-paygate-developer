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
        const isPaymentResult = urlParams.get('page') === 'payment-result' || window.location.hash.includes('payment-result');

        // Phải có ít nhất một trong các trường nhận diện thanh toán hoặc hash payment-result
        if (!rawStatus && !orderId && !txnId && !isPaymentResult) {
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

        // Chuẩn hóa status chính xác theo bảng mã của Pay2Pay API spec
        let finalStatus = 'SUCCESS';
        if (rawStatus) {
            const s = String(rawStatus).trim().toUpperCase();
            if (['SUCCESS', '00', '0', 'PAID', 'COMPLETED', 'APPROVED', 'TRUE', '200', 'OK', 'THÀNH CÔNG'].includes(s)) {
                finalStatus = 'SUCCESS';
            } else if (['PROCESSING', 'PENDING', 'WAITING'].includes(s)) {
                finalStatus = 'PROCESSING';
            } else if (['CANCEL', 'CANCELLED', 'CANCELED', 'HUỶ', 'HỦY'].includes(s)) {
                finalStatus = 'CANCEL';
            } else if (['SUSPECT', 'REVIEW', 'UNDER_REVIEW', 'NGHI VẤN'].includes(s)) {
                finalStatus = 'SUSPECT';
            } else if (['INIT', 'INITIAL', 'CREATED', 'KHỞI TẠO'].includes(s)) {
                finalStatus = 'INIT';
            } else if (['FAIL', 'FAILED', 'FAILURE', 'ERROR', 'THẤT BẠI'].includes(s) || s.startsWith('ERR_')) {
                finalStatus = 'FAIL';
            } else {
                finalStatus = s;
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
                    else {
                        const pending = sessionStorage.getItem('pay2pay_pending_payment');
                        if (pending) {
                            const p = JSON.parse(pending);
                            txnInfo = {
                                status: 'SUCCESS',
                                orderId: p.orderId,
                                amount: p.amount,
                                txnId: 'TXN' + (p.timestamp ? String(p.timestamp).slice(-8) : Date.now().toString().slice(-8)),
                                message: 'Giao dịch hoàn tất thành công'
                            };
                        }
                    }
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

        const isPaymentResultRoute = window.location.hash.includes('payment-result') || combinedParams.get('page') === 'payment-result';
        let txnInfo = parseTxnFromParams(combinedParams);
        
        if (!txnInfo && !isPaymentResultRoute) return false;

        if (!txnInfo) {
            try {
                const saved = sessionStorage.getItem('pay2pay_last_result');
                if (saved) txnInfo = JSON.parse(saved);
                else {
                    const pending = sessionStorage.getItem('pay2pay_pending_payment');
                    if (pending) {
                        const p = JSON.parse(pending);
                        txnInfo = {
                            status: 'SUCCESS',
                            orderId: p.orderId,
                            amount: p.amount,
                            txnId: 'TXN' + (p.timestamp ? String(p.timestamp).slice(-8) : Date.now().toString().slice(-8)),
                            message: 'Giao dịch hoàn tất thành công'
                        };
                    }
                }
            } catch(e) {}
        }

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

        // Xóa query params khỏi URL để URL sạch đẹp: chuyển sang #payment-result
        window.history.replaceState({}, document.title, window.location.pathname + '#payment-result');

        // Hiển thị trang payment-result
        navigate('payment-result');
        renderPaymentResult(txnInfo);

        return true;
    }

    /**
     * Render giao diện kết quả thanh toán dựa trên txnInfo từ Pay2Pay
     * Mapping chính xác theo các trạng thái: SUCCESS, PROCESSING, FAIL, CANCEL, SUSPECT, INIT
     */
    function renderPaymentResult(txnInfo) {
        const iconContainer = document.getElementById('result-icon-container');
        const title = document.getElementById('result-title');
        const message = document.getElementById('result-message');
        const orderInfo = document.getElementById('result-order-info');
        const txnDetails = document.getElementById('result-txn-details');
        const statusBadge = document.getElementById('result-status-badge');

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
                if (statusBadge) {
                    statusBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200';
                    statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span class="lang-vi">Thành công</span><span class="lang-en">Success</span>';
                }
                iconContainer.className = 'w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm';
                iconContainer.innerHTML = '<svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>';
                title.innerHTML = '<span class="lang-vi">Thanh toán thành công!</span><span class="lang-en">Payment Successful!</span>';
                title.className = 'text-2xl font-bold text-green-600 mb-2';
                message.innerHTML = `<span class="lang-vi">${txnInfo.message || 'Giao dịch đã được thanh toán và xử lý thành công qua Pay2Pay.'}</span><span class="lang-en">Your transaction has been processed and paid successfully via Pay2Pay.</span>`;
                break;

            case 'PROCESSING':
                if (statusBadge) {
                    statusBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700 border border-blue-200';
                    statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span><span class="lang-vi">Đang xử lý</span><span class="lang-en">Processing</span>';
                }
                iconContainer.className = 'w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm';
                iconContainer.innerHTML = '<svg class="w-10 h-10 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>';
                title.innerHTML = '<span class="lang-vi">Giao dịch đang xử lý</span><span class="lang-en">Payment Processing</span>';
                title.className = 'text-2xl font-bold text-blue-600 mb-2';
                message.innerHTML = `<span class="lang-vi">${txnInfo.message || 'Giao dịch đang được tiếp nhận và xử lý bởi ngân hàng. Trạng thái sẽ được cập nhật sớm nhất.'}</span><span class="lang-en">The transaction is currently being processed by the bank. Status will update shortly.</span>`;
                break;

            case 'CANCEL':
                if (statusBadge) {
                    statusBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-700 border border-amber-200';
                    statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span><span class="lang-vi">Đã hủy</span><span class="lang-en">Cancelled</span>';
                }
                iconContainer.className = 'w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm';
                iconContainer.innerHTML = '<svg class="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>';
                title.innerHTML = '<span class="lang-vi">Giao dịch đã bị hủy</span><span class="lang-en">Payment Cancelled</span>';
                title.className = 'text-2xl font-bold text-amber-600 mb-2';
                message.innerHTML = `<span class="lang-vi">${txnInfo.message || 'Bạn đã hủy quá trình thanh toán. Đơn hàng chưa được trừ tiền.'}</span><span class="lang-en">Payment was cancelled by the user. No funds were charged.</span>`;
                break;

            case 'SUSPECT':
                if (statusBadge) {
                    statusBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-700 border border-purple-200';
                    statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span><span class="lang-vi">Nghi vấn tra soát</span><span class="lang-en">Under Review</span>';
                }
                iconContainer.className = 'w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm';
                iconContainer.innerHTML = '<svg class="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>';
                title.innerHTML = '<span class="lang-vi">Giao dịch cần tra soát</span><span class="lang-en">Transaction Under Review</span>';
                title.className = 'text-2xl font-bold text-purple-600 mb-2';
                message.innerHTML = `<span class="lang-vi">${txnInfo.message || 'Giao dịch có dấu hiệu bất thường, cần bộ phận thanh toán xác minh trước khi hoàn tất.'}</span><span class="lang-en">Transaction flagged for manual verification before finalizing.</span>`;
                break;

            case 'INIT':
                if (statusBadge) {
                    statusBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200';
                    statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span><span class="lang-vi">Chờ thanh toán</span><span class="lang-en">Pending</span>';
                }
                iconContainer.className = 'w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm';
                iconContainer.innerHTML = '<svg class="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
                title.innerHTML = '<span class="lang-vi">Đơn hàng khởi tạo</span><span class="lang-en">Order Initialized</span>';
                title.className = 'text-2xl font-bold text-slate-700 mb-2';
                message.innerHTML = `<span class="lang-vi">${txnInfo.message || 'Đơn hàng đã được tạo thành công, đang chờ khách hàng thanh toán.'}</span><span class="lang-en">Order has been created, awaiting customer payment.</span>`;
                break;

            case 'FAIL':
            default:
                if (statusBadge) {
                    statusBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-700 border border-rose-200';
                    statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span><span class="lang-vi">Thất bại</span><span class="lang-en">Failed</span>';
                }
                iconContainer.className = 'w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm';
                iconContainer.innerHTML = '<svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>';
                title.innerHTML = '<span class="lang-vi">Thanh toán thất bại</span><span class="lang-en">Payment Failed</span>';
                title.className = 'text-2xl font-bold text-red-600 mb-2';
                message.innerHTML = `<span class="lang-vi">${txnInfo.message || 'Giao dịch không thành công hoặc đã bị từ chối bởi ngân hàng. Vui lòng thử lại.'}</span><span class="lang-en">Transaction was declined or could not be completed. Please try again.</span>`;
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
