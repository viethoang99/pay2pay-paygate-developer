/**
 * Cart Module
 * Quản lý giỏ hàng với localStorage & trải nghiệm responsive theo chuẩn baoyu-design
 */
window.CartModule = (function() {
    const STORAGE_KEY = 'paygate-cart';
    let items = []; // Array of { productId, quantity }

    function load() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            items = saved ? JSON.parse(saved) : [];
        } catch (e) {
            items = [];
        }
    }

    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        document.dispatchEvent(new CustomEvent('cart-updated'));
    }

    function addItem(productId, quantity = 1) {
        const existing = items.find(item => item.productId === productId);
        if (existing) {
            existing.quantity += quantity;
        } else {
            items.push({ productId, quantity });
        }
        save();
        render();
        
        const isEn = document.documentElement.getAttribute('lang') === 'en';
        showToast(isEn ? 'Added to cart successfully!' : 'Đã thêm sản phẩm vào giỏ hàng!', 'success');
    }

    function removeItem(productId) {
        items = items.filter(item => item.productId !== productId);
        save();
        render();
    }

    function updateQuantity(productId, quantity) {
        if (quantity <= 0) {
            removeItem(productId);
            return;
        }
        const item = items.find(i => i.productId === productId);
        if (item) {
            item.quantity = quantity;
            save();
            render();
        }
    }

    function getTotal() {
        return items.reduce((total, item) => {
            const product = ProductsModule.getById(item.productId);
            return total + (product ? product.price * item.quantity : 0);
        }, 0);
    }

    function getCount() {
        return items.reduce((count, item) => count + item.quantity, 0);
    }

    function getItems() {
        return items.map(item => {
            const product = ProductsModule.getById(item.productId);
            return { ...item, product };
        }).filter(item => item.product);
    }

    function clear() {
        items = [];
        save();
    }

    function render() {
        const cartItems = document.getElementById('cart-items');
        const cartTotal = document.getElementById('cart-total-amount');
        const cartSubtotal = document.getElementById('cart-subtotal');
        const cartItemCount = document.getElementById('cart-item-count');
        const emptyCart = document.getElementById('empty-cart');
        const cartWithItems = document.getElementById('cart-with-items');
        const mobileCartBar = document.getElementById('mobile-cart-bar');
        const mobileCartBarTotal = document.getElementById('mobile-cart-bar-total');
        const mobileCartBarCount = document.getElementById('mobile-cart-bar-count');

        if (!cartItems) return;

        const enrichedItems = getItems();
        const total = getTotal();
        const count = getCount();

        if (cartItemCount) {
            cartItemCount.innerHTML = `<span class="lang-vi">${count} món</span><span class="lang-en">${count} items</span>`;
        }

        // Mobile floating checkout bar handling
        if (mobileCartBar) {
            if (count > 0 && window.location.hash.includes('demo')) {
                mobileCartBar.classList.remove('hidden');
                mobileCartBar.classList.add('flex');
                if (mobileCartBarTotal) mobileCartBarTotal.textContent = formatCurrency(total);
                if (mobileCartBarCount) mobileCartBarCount.textContent = count;
            } else {
                mobileCartBar.classList.add('hidden');
                mobileCartBar.classList.remove('flex');
            }
        }

        if (enrichedItems.length === 0) {
            emptyCart.classList.remove('hidden');
            cartWithItems.classList.add('hidden');
            return;
        }

        emptyCart.classList.add('hidden');
        cartWithItems.classList.remove('hidden');

        cartItems.innerHTML = enrichedItems.map(item => `
            <div class="p-3.5 sm:p-4 flex items-center gap-3 hover:bg-slate-50/70 transition-colors">
                <!-- Thumbnail -->
                <div class="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl border border-slate-200/80 shadow-2xs">
                    ${item.product.image}
                </div>
                
                <!-- Details -->
                <div class="flex-1 min-w-0">
                    <h4 class="font-semibold text-slate-900 text-xs sm:text-sm truncate">
                        <span class="lang-vi">${item.product.nameVi || item.product.name}</span>
                        <span class="lang-en">${item.product.nameEn || item.product.name}</span>
                    </h4>
                    <p class="text-[11px] text-slate-400 font-mono mt-0.5">${formatCurrency(item.product.price)}</p>
                </div>

                <!-- Quantity Stepper -->
                <div class="flex items-center space-x-1 flex-shrink-0 bg-slate-100/70 p-1 rounded-lg border border-slate-200/60">
                    <button onclick="CartModule.updateQuantity('${item.productId}', ${item.quantity - 1})" 
                            class="qty-btn h-6 w-6 text-xs rounded border-none bg-white shadow-2xs hover:bg-slate-100" title="Giảm">−</button>
                    <span class="w-5 text-center text-xs font-bold text-slate-800 font-mono">${item.quantity}</span>
                    <button onclick="CartModule.updateQuantity('${item.productId}', ${item.quantity + 1})" 
                            class="qty-btn h-6 w-6 text-xs rounded border-none bg-white shadow-2xs hover:bg-slate-100" title="Tăng">+</button>
                </div>

                <!-- Line Total -->
                <div class="text-right flex-shrink-0 min-w-[65px]">
                    <p class="text-xs font-bold text-primary-600 font-mono">${formatCurrency(item.product.price * item.quantity)}</p>
                </div>

                <!-- Delete Action -->
                <button onclick="CartModule.removeItem('${item.productId}')" 
                        class="text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg p-1.5 transition-colors flex-shrink-0" title="Xóa">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
            </div>
        `).join('');

        if (cartTotal) cartTotal.textContent = formatCurrency(total);
        if (cartSubtotal) cartSubtotal.textContent = formatCurrency(total);
    }

    function updateBadge() {
        const badge = document.getElementById('cart-badge');
        if (!badge) return;
        const count = getCount();
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.classList.remove('hidden');
            badge.classList.add('cart-badge-animate');
            setTimeout(() => badge.classList.remove('cart-badge-animate'), 300);
        } else {
            badge.classList.add('hidden');
        }
        
        // Also sync mobile floating bar
        const mobileCartBar = document.getElementById('mobile-cart-bar');
        const mobileCartBarTotal = document.getElementById('mobile-cart-bar-total');
        const mobileCartBarCount = document.getElementById('mobile-cart-bar-count');
        if (mobileCartBar) {
            if (count > 0 && window.location.hash.includes('demo')) {
                mobileCartBar.classList.remove('hidden');
                mobileCartBar.classList.add('flex');
                if (mobileCartBarTotal) mobileCartBarTotal.textContent = formatCurrency(getTotal());
                if (mobileCartBarCount) mobileCartBarCount.textContent = count;
            } else {
                mobileCartBar.classList.add('hidden');
                mobileCartBar.classList.remove('flex');
            }
        }
    }

    function init() {
        load();
        document.addEventListener('cart-updated', updateBadge);
        updateBadge();
    }

    return {
        addItem,
        removeItem,
        updateQuantity,
        getTotal,
        getCount,
        getItems,
        clear,
        render,
        init
    };
})();
