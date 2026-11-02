/**
 * App Module - Pay2Pay Gateway
 * Khởi tạo ứng dụng, điều hướng SPA, và xử lý callback kết quả thanh toán
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

    /**
     * Trích xuất thông tin giao dịch từ URL query parameters
     * Hỗ trợ chuẩn Pay2Pay, VNPay, và các tham số callback chuẩn hóa
     */
    function parseTxnFromParams(urlParams) {
        if (!urlParams) return null;

        // 1. Nhận diện các biến thể của Status & Code
        const rawStatus = urlParams.get('status') || urlParams.get('Trạng thái') || urlParams.get('paymentStatus') || urlParams.get('resultCode') || urlParams.get('vnp_ResponseCode');
        const rawCode = urlParams.get('code') || urlParams.get('errCode') || '';
        
        // 2. Nhận diện mã đơn hàng (orderId)
        const orderId = urlParams.get('orderId') || urlParams.get('order_id') || urlParams.get('orderID') || urlParams.get('vnp_TxnRef');
        
        // 3. Nhận diện mã giao dịch (txnId)
        const txnId = urlParams.get('txnId') || urlParams.get('txn_id') || urlParams.get('transId') || urlParams.get('trans_id') || urlParams.get('transactionId') || urlParams.get('vnp_TransactionNo');
        
        // 4. Nhận diện số tiền
        let rawAmount = urlParams.get('amount') || urlParams.get('số tiền') || urlParams.get('vnp_Amount');
        if (urlParams.get('vnp_Amount') && !urlParams.get('amount')) {
            // VNPay trả về số tiền nhân 100
            const vnpAmt = parseInt(rawAmount, 10);
            if (!isNaN(vnpAmt)) rawAmount = String(vnpAmt / 100);
        }

        const isPaymentResult = urlParams.get('page') === 'payment-result' || window.location.hash.includes('payment-result');

        // Phải có ít nhất một trường nhận diện hoặc đang ở route payment-result
        if (!rawStatus && !rawCode && !orderId && !txnId && !isPaymentResult) {
            return null;
        }

        // Lấy thông tin pending order từ sessionStorage nếu URL thiếu trường
        let pending = null;
        try {
            const saved = sessionStorage.getItem('pay2pay_pending_payment');
            if (saved) pending = JSON.parse(saved);
        } catch(e) {}

        const finalOrderId = orderId || (pending ? pending.orderId : ('ORD-' + Date.now().toString(36).toUpperCase()));
        const finalAmount = rawAmount || (pending ? pending.amount : '');

        // 5. Chuẩn hóa Status chính xác theo đặc tả của Pay2Pay Gateway
        let finalStatus = '';
        const checkString = String(rawStatus || rawCode || '').trim().toUpperCase();

        if (['SUCCESS', '00', '0', 'PAID', 'COMPLETED', 'APPROVED', 'TRUE', '200', 'OK', 'THÀNH CÔNG'].includes(checkString)) {
            finalStatus = 'SUCCESS';
        } else if (['PROCESSING', 'PENDING', 'WAITING', 'ĐANG XỬ LÝ'].includes(checkString)) {
            finalStatus = 'PROCESSING';
        } else if (['CANCEL', 'CANCELLED', 'CANCELED', 'HUỶ', 'HỦY', 'USER_CANCEL'].includes(checkString)) {
            finalStatus = 'CANCEL';
        } else if (['SUSPECT', 'REVIEW', 'UNDER_REVIEW', 'NGHI VẤN', '29'].includes(checkString) || checkString === 'ERR_MERCHANT_CORE_SUSPECT') {
            finalStatus = 'SUSPECT';
        } else if (['INIT', 'INITIAL', 'CREATED', 'KHỞI TẠO'].includes(checkString)) {
            finalStatus = 'INIT';
        } else if (['FAIL', 'FAILED', 'FAILURE', 'ERROR', 'THẤT BẠI'].includes(checkString) || checkString.startsWith('ERR_')) {
            finalStatus = 'FAIL';
        } else if (checkString) {
            finalStatus = checkString;
        } else if (pending) {
            finalStatus = 'PROCESSING';
        } else {
            finalStatus = 'INIT';
        }

        // 6. Nhận diện message thông báo
        const message = urlParams.get('message') || urlParams.get('Thông báo') || urlParams.get('desc') || urlParams.get('nội dung') || urlParams.get('error') || '';

        return {
            status: finalStatus,
            merchantId: urlParams.get('merchantId') || (window.AppConfig && window.AppConfig.MERCHANT_ID) || 'PP0000141001',
            orderId: finalOrderId,
            txnId: txnId || ('TXN' + (pending && pending.timestamp ? String(pending.timestamp).slice(-8) : Date.now().toString().slice(-8))),
            amount: finalAmount,
            code: rawCode || rawStatus || finalStatus,
            message: message,
            txnDate: urlParams.get('txnDate') || urlParams.get('payDate') || urlParams.get('createAt') || '',
        };
    }

    /**
     * Bắt và xử lý link callback điều hướng từ cổng Pay2Pay
     * Đọc tham số từ cả window.location.search (?status=...) và window.location.hash (#payment-result?...)
     */
    function checkPaymentCallback() {
        const combinedParams = new URLSearchParams(window.location.search);
        
        // Gộp thêm tham số nếu có ở sau dấu ? của hash
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
        
        // Nếu không có tham số callback và cũng không ở trang kết quả thì bỏ qua
        if (!txnInfo && !isPaymentResultRoute) return false;

        // Nếu ở route payment-result nhưng thiếu params, thử lấy kết quả gần nhất từ sessionStorage
        if (!txnInfo) {
            try {
                const saved = sessionStorage.getItem('pay2pay_last_result');
                if (saved) txnInfo = JSON.parse(saved);
            } catch(e) {}
        }

        if (!txnInfo) return false;

        console.log('[Pay2Pay Callback Detected]:', txnInfo);

        // Nếu thanh toán THÀNH CÔNG: Dọn sạch giỏ hàng
        if (txnInfo.status === 'SUCCESS') {
            if (window.CartModule) {
                CartModule.clear();
                CartModule.render();
            }
        }

        // Lưu kết quả vào sessionStorage
        sessionStorage.setItem('pay2pay_last_result', JSON.stringify(txnInfo));
        sessionStorage.removeItem('pay2pay_pending_payment');

        // Dọn URL query params về #payment-result sạch sẽ
        if (window.location.search) {
            window.history.replaceState({}, document.title, window.location.pathname + '#payment-result');
        }

        // Điều hướng và render kết quả
        navigate('payment-result');
        renderPaymentResult(txnInfo);

        return true;
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
            } else {
                // Hiển thị trạng thái khi người dùng vào thẳng trang mà chưa có giao dịch
                renderEmptyPaymentResult();
            }
            return;
        }
        
        navigate(page);
    }

    /**
     * Render giao diện khi người dùng truy cập trực tiếp #payment-result mà chưa có giao dịch
     */
    function renderEmptyPaymentResult() {
        const iconContainer = document.getElementById('result-icon-container');
        const title = document.getElementById('result-title');
        const message = document.getElementById('result-message');
        const orderInfo = document.getElementById('result-order-info');
        const txnDetails = document.getElementById('result-txn-details');

        if (!iconContainer || !title) return;

        if (orderInfo) orderInfo.classList.add('hidden');
        if (txnDetails) txnDetails.classList.add('hidden');

        iconContainer.className = 'w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-200/60';
        iconContainer.innerHTML = '<svg class="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
        title.innerHTML = '<span class="lang-vi">Chưa có thông tin đơn hàng</span><span class="lang-en">No Transaction Data</span>';
        title.className = 'text-2xl sm:text-3xl font-extrabold text-slate-800 mb-2 tracking-tight';
        if (message) {
            message.innerHTML = '<span class="lang-vi">Vui lòng chọn sản phẩm và thanh toán để xem hóa đơn kết quả giao dịch.</span><span class="lang-en">Please select products and complete payment to view the digital receipt.</span>';
        }
    }

    /**
     * Render giao diện chi tiết kết quả thanh toán theo status mapping chuẩn Pay2Pay
     */
    function renderPaymentResult(txnInfo) {
        const iconContainer = document.getElementById('result-icon-container');
        const title = document.getElementById('result-title');
        const message = document.getElementById('result-message');
        const orderInfo = document.getElementById('result-order-info');
        const txnDetails = document.getElementById('result-txn-details');
        const statusBadge = document.getElementById('result-status-badge');

        if (!iconContainer || !title) return;

        // 1. Hiển thị thông tin mã đơn hàng
        if (txnInfo.orderId) {
            if (orderInfo) orderInfo.classList.remove('hidden');
            const el = document.getElementById('result-order-id');
            if (el) el.textContent = txnInfo.orderId;
        }

        // 2. Hiển thị chi tiết giao dịch số tiền & thời gian
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
                    // Hỗ trợ cả định dạng YYYYMMDDHHMMSS và YYYYMMDD
                    if (d.length >= 14) {
                        dateEl.textContent = `${d.slice(6,8)}/${d.slice(4,6)}/${d.slice(0,4)} ${d.slice(8,10)}:${d.slice(10,12)}`;
                    } else if (d.length === 8) {
                        dateEl.textContent = `${d.slice(6,8)}/${d.slice(4,6)}/${d.slice(0,4)}`;
                    } else {
                        dateEl.textContent = d;
                    }
                } else {
                    const now = new Date();
                    const pad = n => String(n).padStart(2, '0');
                    dateEl.textContent = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
                }
            }

            txnDetails.classList.remove('hidden');
        }

        // 3. Phân nhánh hiển thị theo trạng thái Pay2Pay
        switch(txnInfo.status) {
            case 'SUCCESS':
                if (statusBadge) {
                    statusBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200';
                    statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span class="lang-vi">Thành công</span><span class="lang-en">Success</span>';
                }
                iconContainer.className = 'w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-emerald-200/80';
                iconContainer.innerHTML = '<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>';
                title.innerHTML = '<span class="lang-vi">Thanh toán thành công!</span><span class="lang-en">Payment Successful!</span>';
                title.className = 'text-2xl sm:text-3xl font-extrabold text-emerald-600 mb-2 tracking-tight';
                if (message) {
                    message.innerHTML = `<span class="lang-vi">${txnInfo.message || 'Giao dịch đã được thanh toán và xử lý thành công qua Pay2Pay.'}</span><span class="lang-en">${txnInfo.message || 'Your transaction has been processed and paid successfully via Pay2Pay.'}</span>`;
                }
                break;

            case 'PROCESSING':
                if (statusBadge) {
                    statusBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700 border border-blue-200';
                    statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span><span class="lang-vi">Đang xử lý</span><span class="lang-en">Processing</span>';
                }
                iconContainer.className = 'w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-blue-200/80';
                iconContainer.innerHTML = '<svg class="w-10 h-10 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>';
                title.innerHTML = '<span class="lang-vi">Giao dịch đang xử lý</span><span class="lang-en">Payment Processing</span>';
                title.className = 'text-2xl sm:text-3xl font-extrabold text-blue-600 mb-2 tracking-tight';
                if (message) {
                    message.innerHTML = `<span class="lang-vi">${txnInfo.message || 'Giao dịch đang được tiếp nhận và xử lý bởi ngân hàng. Trạng thái sẽ được cập nhật sớm nhất.'}</span><span class="lang-en">${txnInfo.message || 'The transaction is currently being processed by the bank. Status will update shortly.'}</span>`;
                }
                break;

            case 'CANCEL':
                if (statusBadge) {
                    statusBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-700 border border-amber-200';
                    statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span><span class="lang-vi">Đã hủy</span><span class="lang-en">Cancelled</span>';
                }
                iconContainer.className = 'w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-amber-200/80';
                iconContainer.innerHTML = '<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>';
                title.innerHTML = '<span class="lang-vi">Giao dịch đã bị hủy</span><span class="lang-en">Payment Cancelled</span>';
                title.className = 'text-2xl sm:text-3xl font-extrabold text-amber-600 mb-2 tracking-tight';
                if (message) {
                    message.innerHTML = `<span class="lang-vi">${txnInfo.message || 'Bạn đã hủy quá trình thanh toán. Đơn hàng chưa bị trừ tiền.'}</span><span class="lang-en">${txnInfo.message || 'Payment was cancelled by user. No funds were deducted.'}</span>`;
                }
                break;

            case 'SUSPECT':
                if (statusBadge) {
                    statusBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-700 border border-purple-200';
                    statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span><span class="lang-vi">Nghi vấn tra soát</span><span class="lang-en">Under Review</span>';
                }
                iconContainer.className = 'w-20 h-20 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-purple-200/80';
                iconContainer.innerHTML = '<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>';
                title.innerHTML = '<span class="lang-vi">Giao dịch cần tra soát</span><span class="lang-en">Transaction Under Review</span>';
                title.className = 'text-2xl sm:text-3xl font-extrabold text-purple-600 mb-2 tracking-tight';
                if (message) {
                    message.innerHTML = `<span class="lang-vi">${txnInfo.message || 'Giao dịch có dấu hiệu bất thường, bộ phận kỹ thuật và ngân hàng đang tiến hành đối soát.'}</span><span class="lang-en">${txnInfo.message || 'Transaction flagged for manual verification before finalizing.'}</span>`;
                }
                break;

            case 'INIT':
                if (statusBadge) {
                    statusBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200';
                    statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span><span class="lang-vi">Chờ thanh toán</span><span class="lang-en">Pending</span>';
                }
                iconContainer.className = 'w-20 h-20 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-200/80';
                iconContainer.innerHTML = '<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
                title.innerHTML = '<span class="lang-vi">Đơn hàng khởi tạo</span><span class="lang-en">Order Initialized</span>';
                title.className = 'text-2xl sm:text-3xl font-extrabold text-slate-700 mb-2 tracking-tight';
                if (message) {
                    message.innerHTML = `<span class="lang-vi">${txnInfo.message || 'Đơn hàng đã được tạo thành công, đang chờ khách hàng thanh toán.'}</span><span class="lang-en">${txnInfo.message || 'Order has been created, awaiting customer payment.'}</span>`;
                }
                break;

            case 'FAIL':
            default:
                if (statusBadge) {
                    statusBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-700 border border-rose-200';
                    statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span><span class="lang-vi">Thất bại</span><span class="lang-en">Failed</span>';
                }
                iconContainer.className = 'w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-rose-200/80';
                iconContainer.innerHTML = '<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>';
                title.innerHTML = '<span class="lang-vi">Thanh toán thất bại</span><span class="lang-en">Payment Failed</span>';
                title.className = 'text-2xl sm:text-3xl font-extrabold text-rose-600 mb-2 tracking-tight';
                if (message) {
                    const errorDetail = txnInfo.code && txnInfo.code !== 'FAIL' ? ` (${txnInfo.code})` : '';
                    message.innerHTML = `<span class="lang-vi">${txnInfo.message || 'Giao dịch không thành công hoặc đã bị từ chối bởi ngân hàng.'}${errorDetail}</span><span class="lang-en">${txnInfo.message || 'Transaction was declined or could not be completed.'}${errorDetail}</span>`;
                }
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

        // ƯU TIÊN 1: Kiểm tra callback từ Pay2Pay (?status=... trong URL hoặc hash)
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

        console.log('%c' + AppConfig.GATEWAY_NAME + ' Developer Portal & Demo Store Loaded', 'color: #4f46e5; font-size: 14px; font-weight: bold;');
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
