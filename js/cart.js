/**
 * Cart Module
 * Quản lý giỏ hàng với localStorage
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
        showToast('Đã thêm vào giỏ hàng!', 'success');
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

        if (!cartItems) return;

        const enrichedItems = getItems();
        const total = getTotal();
        const count = getCount();

        if (cartItemCount) {
            cartItemCount.textContent = `${count} món`;
        }

        if (enrichedItems.length === 0) {
            emptyCart.classList.remove('hidden');
            cartWithItems.classList.add('hidden');
            return;
        }

        emptyCart.classList.add('hidden');
        cartWithItems.classList.remove('hidden');

        cartItems.innerHTML = enrichedItems.map(item => `
            <div class="p-3 sm:p-4 flex items-center gap-3">
                <div class="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl border border-gray-100">
                    ${item.product.image}
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-medium text-gray-900 text-sm truncate" title="${item.product.name}">${item.product.name}</h4>
                    <p class="text-xs text-gray-500">${formatCurrency(item.product.price)}</p>
                </div>
                <div class="flex items-center space-x-1 flex-shrink-0">
                    <button onclick="CartModule.updateQuantity('${item.productId}', ${item.quantity - 1})" 
                            class="qty-btn" title="Giảm">−</button>
                    <span class="w-6 text-center text-xs font-semibold text-gray-800">${item.quantity}</span>
                    <button onclick="CartModule.updateQuantity('${item.productId}', ${item.quantity + 1})" 
                            class="qty-btn" title="Tăng">+</button>
                </div>
                <div class="text-right flex-shrink-0 min-w-[70px]">
                    <p class="text-xs font-bold text-gray-900">${formatCurrency(item.product.price * item.quantity)}</p>
                </div>
                <button onclick="CartModule.removeItem('${item.productId}')" 
                        class="text-gray-400 hover:text-red-500 transition-colors p-1 flex-shrink-0" title="Xóa">
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

/**
 * Toast Notification Helper
 */
window.showToast = function(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    const icon = type === 'success' 
        ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>'
        : type === 'error'
        ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>'
        : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';

    const toast = document.createElement('div');
    toast.className = `toast-enter flex items-center space-x-3 ${bgColor} text-white px-5 py-3 rounded-xl shadow-lg`;
    toast.innerHTML = `${icon}<span class="text-sm font-medium">${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
};
