/**
 * Products Module
 * Quản lý dữ liệu sản phẩm và render UI
 */
window.ProductsModule = (function() {
    const products = [
        {
            id: 'sp001',
            name: 'Tai nghe Bluetooth Pro',
            price: 890000,
            image: '🎧',
            description: 'Tai nghe không dây chống ồn, pin 30 giờ',
            category: 'Phụ kiện'
        },
        {
            id: 'sp002',
            name: 'Bàn phím cơ RGB',
            price: 1290000,
            image: '⌨️',
            description: 'Switch Cherry MX Blue, đèn RGB 16 triệu màu',
            category: 'Phụ kiện'
        },
        {
            id: 'sp003',
            name: 'Chuột gaming không dây',
            price: 650000,
            image: '🖱️',
            description: 'Sensor 25000 DPI, pin sạc nhanh 70 giờ',
            category: 'Phụ kiện'
        },
        {
            id: 'sp004',
            name: 'Ốp lưng iPhone 15',
            price: 250000,
            image: '📱',
            description: 'Chất liệu silicon cao cấp, chống sốc MIL-STD',
            category: 'Phụ kiện'
        },
        {
            id: 'sp005',
            name: 'Sạc nhanh 65W GaN',
            price: 490000,
            image: '🔌',
            description: 'Công nghệ GaN III, 3 cổng USB-C + USB-A',
            category: 'Phụ kiện'
        },
        {
            id: 'sp006',
            name: 'Webcam 4K HDR',
            price: 1890000,
            image: '📷',
            description: 'Độ phân giải 4K, tự động lấy nét, mic kép',
            category: 'Thiết bị'
        },
        {
            id: 'sp007',
            name: 'Đèn bàn LED thông minh',
            price: 750000,
            image: '💡',
            description: 'Điều chỉnh nhiệt độ màu, điều khiển qua app',
            category: 'Thiết bị'
        },
        {
            id: 'sp008',
            name: 'Hub USB-C 7-in-1',
            price: 590000,
            image: '🔗',
            description: 'HDMI 4K, USB 3.0, SD/TF, PD 100W',
            category: 'Phụ kiện'
        }
    ];

    function getById(id) {
        return products.find(p => p.id === id);
    }

    function render() {
        const grid = document.getElementById('products-grid');
        if (!grid) return;

        grid.innerHTML = products.map(product => `
            <div class="product-card bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="h-48 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                    <span class="text-7xl">${product.image}</span>
                </div>
                <div class="p-5">
                    <span class="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded-full">${product.category}</span>
                    <h3 class="text-lg font-semibold text-gray-900 mt-2 mb-1">${product.name}</h3>
                    <p class="text-sm text-gray-500 mb-4">${product.description}</p>
                    <div class="flex items-center justify-between">
                        <span class="text-lg font-bold text-primary-600">${formatCurrency(product.price)}</span>
                        <button onclick="CartModule.addItem('${product.id}')" 
                                class="add-to-cart-btn px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                            + Thêm
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    return {
        products,
        getById,
        render
    };
})();
